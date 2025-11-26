package com.flowmind.domain.dataset.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.flowmind.domain.dataset.dto.AnnotationDto;
import com.flowmind.domain.dataset.dto.DatasetDetailResponse;
import com.flowmind.domain.dataset.dto.DatasetResponse;
import com.flowmind.domain.dataset.dto.ImageWithAnnotationsDto;
import com.flowmind.domain.dataset.dto.SaveAnnotationsRequest;
import com.flowmind.domain.dataset.entity.*;
import com.flowmind.domain.dataset.repository.*;
import com.flowmind.domain.user.entity.User;
import com.flowmind.util.CurrentUserProvider;

import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class DatasetService {

    private final DatasetRepository datasetRepository;
    private final DatasetVersionRepository datasetVersionRepository;
    private final AssetRepository assetRepository;
    private final CurrentUserProvider currentUserProvider;
    private final LabelClassRepository labelClassRepository;
    private final AnnotationRepository annotationRepository;

    @Value("${app.dataset.root-path}")
    private String datasetRootPath;
    
    private Path resolveDatasetDir(Dataset dataset) {
        Long userId = dataset.getUserId();
        Long datasetId = dataset.getDatasetId();
        String name = dataset.getName() != null ? dataset.getName() : "dataset";

        String safeName = name.replaceAll("[^a-zA-Z0-9._-]", "_");

        return Paths.get(
                datasetRootPath,
                "u" + userId,
                datasetId + "_" + safeName
        );
    }

    /** 특정 버전(v0, v1, ...)의 디렉터리 */
    private Path resolveVersionDir(DatasetVersion version) {
        Dataset dataset = version.getDataset();
        String versionTag = version.getVersionTag();
        return resolveDatasetDir(dataset).resolve(versionTag);
    }

    @Transactional
    public DatasetVersion createDatasetWithV0(String datasetName,
                                              List<MultipartFile> files,
                                              String description) {

        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("업로드할 이미지가 없습니다.");
        }

        // 1. 현재 로그인 유저
        User user = currentUserProvider.getCurrentUser();
        Long userId = user.getUserId();

        // 2. (userId, name) 기준으로 Dataset 재사용 or 생성
        Dataset dataset = datasetRepository.findByUserIdAndName(userId, datasetName)
                .orElseGet(() -> {
                    Dataset d = Dataset.builder()
                            .name(datasetName)
                            .userId(userId)
                            .description(description)
                            .build();
                    return datasetRepository.save(d);
                });

        // 3. v0 버전 찾기 or 생성
        DatasetVersion version = datasetVersionRepository
                .findByDatasetIdAndVersionAndUser(dataset.getDatasetId(), "v0", userId)
                .orElseGet(() -> {
                    DatasetVersion v = DatasetVersion.builder()
                            .versionTag("v0")
                            .build();
                    v.setDataset(dataset);
                    return datasetVersionRepository.save(v);
                });

        // 4. v0 디렉터리 생성
        Path versionDir = resolveVersionDir(version);
        try {
            Files.createDirectories(versionDir);
        } catch (IOException e) {
            throw new RuntimeException("데이터셋 디렉토리를 생성할 수 없습니다: " + versionDir, e);
        }

        // 5. 각 파일 저장 (이미 있으면 스킵)
        for (MultipartFile file : files) {
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isBlank()) {
                continue;
            }

            // 같은 버전(v0)에 같은 이름의 Asset이 있으면 스킵
            boolean exists = assetRepository
                    .findByDatasetVersionAndName(version, originalFilename)
                    .isPresent();
            if (exists) {
                continue;
            }

            Path target = versionDir.resolve(originalFilename);

            try {
                file.transferTo(target.toFile());
            } catch (IOException e) {
                throw new RuntimeException("파일 저장에 실패했습니다: " + originalFilename, e);
            }

            Asset asset = Asset.builder()
                    .name(originalFilename)
                    .storageUri(target.toString())
                    .build();
            asset.setDatasetVersion(version);
            assetRepository.save(asset);
        }

        // 항상 v0 반환
        return version;
    }
    
    public DatasetDetailResponse getDatasetDetail(Long datasetId, String versionTag, Long userId) {
        DatasetVersion version = datasetVersionRepository
                .findByDatasetIdAndVersionAndUser(datasetId, versionTag, userId)
                .orElseThrow(() -> new IllegalArgumentException("데이터셋 또는 버전을 찾을 수 없습니다."));

        // Asset + Annotation + LabelClass 로드
        List<Asset> assets = assetRepository.findWithAnnotationsByDatasetVersion(version);

        List<ImageWithAnnotationsDto> imageDtos = assets.stream()
                .map(asset -> {
                    List<AnnotationDto> annDtos = asset.getAnnotations().stream()
                            .map(ann -> new AnnotationDto(
                                    ann.getAnnotationId(),
                                    ann.getLabelClass().getName(),
                                    ann.getXCenter(),
                                    ann.getYCenter(),
                                    ann.getWidth(),
                                    ann.getHeight()
                            ))
                            .toList();

                    // 실제 이미지 파일은 별도 엔드포인트에서 서빙
                    String imageUrl = "/api/datasets/assets/" + asset.getAssetId() + "/image";

                    return new ImageWithAnnotationsDto(
                            asset.getAssetId(),
                            asset.getName(),
                            imageUrl,
                            annDtos
                    );
                })
                .toList();

        return new DatasetDetailResponse(
                version.getDataset().getDatasetId(),
                version.getDataset().getName(),
                version.getVersionTag(),
                version.getCreatedAt().toString(),
                version.getDataset().getDescription(),   // description 칼럼이 있다면
                imageDtos
        );
    }
    
    public List<DatasetResponse> getDatasetsWithVersions(Long userId) {
        List<Dataset> datasets = datasetRepository.findByUserId(userId);

        return datasets.stream()
                .map(DatasetResponse::from)
                .toList();
    }
    
    @Transactional
    public void saveAnnotationsAndPrepareYolo(SaveAnnotationsRequest request, Long userId) {

        // 0. 기본 값 검증
        if (request == null) {
            throw new IllegalArgumentException("요청이 비어 있습니다.");
        }
        if (request.getDatasetId() == null) {
            throw new IllegalArgumentException("datasetId가 필요합니다.");
        }
        if (request.getVersion() == null || request.getVersion().isBlank()) {
            throw new IllegalArgumentException("versionTag(버전)가 필요합니다.");
        }

        Long datasetId = request.getDatasetId();
        String versionTag = request.getVersion();

        // 1. Dataset 확인 + 소유자 검증
        Dataset dataset = datasetRepository.findById(datasetId)
                .orElseThrow(() -> new IllegalArgumentException("데이터셋을 찾을 수 없습니다."));

        if (!dataset.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 데이터셋만 수정할 수 있습니다.");
        }

        // 2. datasetVersion 찾기 (없으면 생성)
        DatasetVersion version = datasetVersionRepository
                .findByDatasetIdAndVersionAndUser(datasetId, versionTag, userId)
                .orElseGet(() -> {
                    DatasetVersion v = DatasetVersion.builder()
                            .versionTag(versionTag)
                            .build();
                    v.setDataset(dataset);
                    return datasetVersionRepository.save(v);
                });

        // 버전 디렉터리 (datasets/u{userId}/{datasetId}_{name}/{versionTag})
        Path versionDir = resolveVersionDir(version);
        try {
            Files.createDirectories(versionDir);
        } catch (IOException e) {
            throw new RuntimeException("데이터셋 버전 디렉토리 생성 실패: " + versionDir, e);
        }

        // 3. label_class 로딩 (이미 있는 라벨들)
        List<LabelClass> existingClasses = labelClassRepository.findByDatasetVersion(version);
        Map<String, LabelClass> labelMap = new HashMap<>();
        int maxClassId = -1;
        for (LabelClass lc : existingClasses) {
            labelMap.put(lc.getName(), lc);
            if (lc.getClassId() > maxClassId) {
                maxClassId = lc.getClassId();
            }
        }
        int nextClassId = maxClassId + 1; // 없으면 0부터 시작

        // 4. 이미지 단위로 돌면서 DB + txt 업데이트
        if (request.getAnnotations() != null) {
            for (SaveAnnotationsRequest.ImageAnnotationsPayload imagePayload : request.getAnnotations()) {

                if (imagePayload == null || imagePayload.getImageId() == null) {
                    continue;
                }

                Long srcAssetId = imagePayload.getImageId();

                // 4-1. 기준 Asset (보통 v0 쪽) 찾기
                Asset sourceAsset = assetRepository.findById(srcAssetId)
                        .orElseThrow(() -> new IllegalArgumentException("Asset를 찾을 수 없습니다: " + srcAssetId));

                String originalName = sourceAsset.getName();
                Path srcImagePath = Paths.get(sourceAsset.getStorageUri());

                // 파일명 결정 (이름이 null/빈 값일 경우, 경로에서 파일명 사용)
                String finalFileName = (originalName == null || originalName.isBlank())
                        ? srcImagePath.getFileName().toString()
                        : originalName;

                // 4-2. 현재 버전에 같은 이름의 Asset이 있으면 재사용, 없으면 이미지 복사 후 생성
                Optional<Asset> optExistingAsset =
                        assetRepository.findByDatasetVersionAndName(version, finalFileName);

                Asset assetForVersion;
                if (optExistingAsset.isPresent()) {
                    assetForVersion = optExistingAsset.get();
                } else {
                    Path destImagePath = versionDir.resolve(srcImagePath.getFileName());
                    try {
                        Files.copy(srcImagePath, destImagePath, StandardCopyOption.REPLACE_EXISTING);
                    } catch (IOException e) {
                        throw new RuntimeException("이미지 복사 실패: " + srcImagePath + " -> " + destImagePath, e);
                    }

                    assetForVersion = Asset.builder()
                            .name(finalFileName)
                            .storageUri(destImagePath.toString())
                            .build();
                    assetForVersion.setDatasetVersion(version);
                    assetForVersion = assetRepository.save(assetForVersion);
                }

                Asset asset = assetForVersion;

                // 4-3. 기존 주석 삭제 (해당 버전에서만)
                annotationRepository.deleteByAsset(asset);

                // 4-4. txt 파일 경로 계산
                Path imagePath = Paths.get(asset.getStorageUri()); // 예: .../{versionTag}/dog1.jpg
                String fileName = imagePath.getFileName().toString();
                int dotIndex = fileName.lastIndexOf('.');
                String baseName = (dotIndex == -1) ? fileName : fileName.substring(0, dotIndex);
                Path labelTxtPath = imagePath.resolveSibling(baseName + ".txt");

                List<String> yoloLines = new ArrayList<>();

                List<SaveAnnotationsRequest.AnnotationPayload> annList = imagePayload.getAnnotations();
                if (annList != null) {
                    for (SaveAnnotationsRequest.AnnotationPayload annPayload : annList) {
                        String labelName = annPayload.getLabel();

                        // 4-5. label_class에 없으면 새로 생성
                        LabelClass labelClass = labelMap.get(labelName);
                        if (labelClass == null) {
                            labelClass = LabelClass.builder()
                                    .classId(nextClassId)
                                    .datasetVersion(version)
                                    .name(labelName)
                                    .build();
                            labelClassRepository.save(labelClass);
                            labelMap.put(labelName, labelClass);
                            nextClassId++;
                        }

                        // 4-6. annotation 엔티티 생성/저장
                        Annotation annotation = Annotation.builder()
                                .asset(asset)
                                .labelClass(labelClass)
                                .storageUri(labelTxtPath.toString())
                                .xCenter(annPayload.getXCenter())
                                .yCenter(annPayload.getYCenter())
                                .width(annPayload.getWidth())
                                .height(annPayload.getHeight())
                                .build();
                        annotationRepository.save(annotation);

                        // YOLO 포맷 라인
                        String line = String.format(
                                "%d %.6f %.6f %.6f %.6f",
                                labelClass.getClassId(),
                                annPayload.getXCenter(),
                                annPayload.getYCenter(),
                                annPayload.getWidth(),
                                annPayload.getHeight()
                        );
                        yoloLines.add(line);
                    }
                }

                // 4-7. txt 파일 쓰기 (어노테이션 없으면 삭제)
                try {
                    if (yoloLines.isEmpty()) {
                        Files.deleteIfExists(labelTxtPath);
                    } else {
                        Files.write(
                                labelTxtPath,
                                yoloLines,
                                StandardOpenOption.CREATE,
                                StandardOpenOption.TRUNCATE_EXISTING
                        );
                    }
                } catch (IOException e) {
                    throw new RuntimeException("주석 txt 파일 생성 중 오류: " + labelTxtPath, e);
                }
            }
        }

        // 5. YOLO 학습용 폴더(images/labels train/val/test) + data.yaml 재구성
        prepareYoloFoldersAndYaml(version, labelMap);
    }
    
    @Transactional
    public void prepareYoloFoldersAndYaml(DatasetVersion version, Map<String, LabelClass> labelMap) {
        // 1. version 디렉토리: datasets/{datasetName}/{versionTag}
        Path versionDir = resolveVersionDir(version);

        // 2. YOLO 폴더 구조 생성
        Path imagesTrain = versionDir.resolve(Paths.get("images", "train"));
        Path imagesVal   = versionDir.resolve(Paths.get("images", "val"));
        Path imagesTest  = versionDir.resolve(Paths.get("images", "test"));

        Path labelsTrain = versionDir.resolve(Paths.get("labels", "train"));
        Path labelsVal   = versionDir.resolve(Paths.get("labels", "val"));
        Path labelsTest  = versionDir.resolve(Paths.get("labels", "test"));

        try {
            Files.createDirectories(imagesTrain);
            Files.createDirectories(imagesVal);
            Files.createDirectories(imagesTest);
            Files.createDirectories(labelsTrain);
            Files.createDirectories(labelsVal);
            Files.createDirectories(labelsTest);
        } catch (IOException e) {
            throw new RuntimeException("YOLO 폴더 생성 실패: " + versionDir, e);
        }

        // 3. 전체 asset 목록 로딩
        List<Asset> assets = assetRepository.findByDatasetVersion(version);
        Collections.shuffle(assets); // 랜덤 섞기

        int total = assets.size();
        int trainCnt = (int) Math.round(total * 0.8);
        int valCnt   = (int) Math.round(total * 0.1);
        int testCnt  = total - trainCnt - valCnt;

        int idx = 0;
        for (Asset asset : assets) {
            Path imgPath = Paths.get(asset.getStorageUri());
            String fileName = imgPath.getFileName().toString();   // 예: "dog_0001.jpg"
            int dotIndex = fileName.lastIndexOf('.');
            String baseName = (dotIndex == -1) ? fileName : fileName.substring(0, dotIndex);
            Path srcLabel = imgPath.resolveSibling(baseName + ".txt");

            String split;
            Path destImgDir;
            Path destLabelDir;

            if (idx < trainCnt) {
                split = "train";
                destImgDir = imagesTrain;
                destLabelDir = labelsTrain;
            } else if (idx < trainCnt + valCnt) {
                split = "val";
                destImgDir = imagesVal;
                destLabelDir = labelsVal;
            } else {
                split = "test";
                destImgDir = imagesTest;
                destLabelDir = labelsTest;
            }
            idx++;

            // asset.split 컬럼 업데이트 (ENUM('train','val','test'))
            asset.setSplit(split); // Asset 엔티티에 setSplit(String split) 추가 필요

            // 이미지/라벨 파일 복사
            try {
                // 이미지
                Path destImg = destImgDir.resolve(fileName);
                Files.copy(imgPath, destImg, StandardCopyOption.REPLACE_EXISTING);

                // 라벨(txt) - 파일 없을 수도 있음(어노테이션 없는 이미지)
                if (Files.exists(srcLabel)) {
                    Path destLabel = destLabelDir.resolve(baseName + ".txt");
                    Files.copy(srcLabel, destLabel, StandardCopyOption.REPLACE_EXISTING);
                }
            } catch (IOException e) {
                throw new RuntimeException("YOLO 데이터셋 복사 중 오류: " + imgPath, e);
            }
        }

        // 4. dataset_version 정보 업데이트 (train_cnt, valid_cnt, test_cnt, ratio)
        version.setTrainCnt(trainCnt);
        version.setValidCnt(valCnt);
        version.setTestCnt(testCnt);
        // ratio JSON은 {"train":0.8,"val":0.1,"test":0.1} 이런 형식으로 넣어주면 됨
        version.setRatio("{\"train\":0.8,\"val\":0.1,\"test\":0.1}");

        // 5. data.yaml 생성
        createDataYaml(versionDir, labelMap);
    }

    private void createDataYaml(Path versionDir, Map<String, LabelClass> labelMap) {
        Path yamlPath = versionDir.resolve("data.yaml");

        // class_id 순으로 names 정렬
        List<LabelClass> classes = new ArrayList<>(labelMap.values());
        classes.sort(Comparator.comparing(LabelClass::getClassId));

        StringBuilder sb = new StringBuilder();
        sb.append("train: images/train\n");
        sb.append("val: images/val\n");
        sb.append("test: images/test\n\n");

        sb.append("nc: ").append(classes.size()).append("\n");
        sb.append("names: [");
        for (int i = 0; i < classes.size(); i++) {
            if (i > 0) sb.append(", ");
            sb.append(classes.get(i).getName());
        }
        sb.append("]\n");

        try {
            Files.writeString(yamlPath, sb.toString(), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("data.yaml 생성 실패: " + yamlPath, e);
        }
    }
    
    @Transactional
    public void deleteDataset(Long datasetId, Long userId) {
        // 1. 데이터셋 조회 + 소유자 검증
        Dataset dataset = datasetRepository.findById(datasetId)
                .orElseThrow(() -> new IllegalArgumentException("데이터셋을 찾을 수 없습니다."));

        if (!dataset.getUserId().equals(userId)) {
            throw new IllegalArgumentException("본인의 데이터셋만 삭제할 수 있습니다.");
        }

        // 2. 버전들 로딩
        List<DatasetVersion> versions = dataset.getVersions();

        // 3. 각 버전별로 annotation → label_class 순으로 삭제
        for (DatasetVersion version : versions) {
            // 3-1) asset 별로 annotation 먼저 삭제
            for (Asset asset : version.getAssets()) {
                annotationRepository.deleteByAsset(asset);
            }

            // 3-2) 해당 버전의 label_class 삭제
            List<LabelClass> classes = labelClassRepository.findByDatasetVersion(version);
            if (!classes.isEmpty()) {
                labelClassRepository.deleteAll(classes);
            }
        }

        // 4. 실제 파일 시스템에서 디렉터리 삭제
        Path datasetDir = resolveDatasetDir(dataset);
        deleteDirectoryRecursively(datasetDir);  // 이미 만들어둔 재귀 삭제 함수

        // 5. 마지막으로 dataset 삭제
        //    → cascade = ALL + orphanRemoval = true 설정 덕분에
        //      dataset_version, asset, annotation 엔티티도 같이 제거됨
        datasetRepository.delete(dataset);
    }

    
    private void deleteDirectoryRecursively(Path dir) {
        if (dir == null || !Files.exists(dir)) {
            return;
        }
        try {
            // 하위 파일/폴더까지 모두 순회 → 가장 깊은 것부터 삭제
            Files.walk(dir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            throw new RuntimeException("파일/디렉토리 삭제 실패: " + path, e);
                        }
                    });
        } catch (IOException e) {
            throw new RuntimeException("데이터셋 디렉토리 삭제 중 오류가 발생했습니다: " + dir, e);
        }
    }
}
