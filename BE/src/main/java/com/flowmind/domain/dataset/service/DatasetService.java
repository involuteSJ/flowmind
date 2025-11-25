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
import com.flowmind.domain.dataset.entity.*;
import com.flowmind.domain.dataset.repository.*;
import com.flowmind.domain.user.entity.User;
import com.flowmind.util.CurrentUserProvider;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DatasetService {

    private final DatasetRepository datasetRepository;
    private final DatasetVersionRepository datasetVersionRepository;
    private final AssetRepository assetRepository;
    private final CurrentUserProvider currentUserProvider;

    @Value("${app.dataset.root-path}")
    private String datasetRootPath;

    public DatasetVersion createDatasetWithV0(String datasetName, List<MultipartFile> files) {

        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("업로드할 이미지가 없습니다.");
        }

        // 1. 현재 로그인한 유저
        User user = currentUserProvider.getCurrentUser();

        // 2. Dataset 생성/저장
        Dataset dataset = Dataset.builder()
                .name(datasetName)
                .userId(user.getUserId())
                .build();
        datasetRepository.save(dataset);

        // 3. v0 버전 생성
        DatasetVersion version = DatasetVersion.builder()
                .versionTag("v0")
                .build();
        version.setDataset(dataset);
        datasetVersionRepository.save(version);

        // 4. 파일 시스템에 저장 경로 생성: datasets/{이름}/v0/
        Path versionDir = Paths.get(datasetRootPath, datasetName, "v0");
        try {
            Files.createDirectories(versionDir);
        } catch (IOException e) {
            throw new RuntimeException("데이터셋 디렉토리를 생성할 수 없습니다: " + versionDir, e);
        }

        // 5. 각 파일 저장 + Asset 생성
        for (MultipartFile file : files) {
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isBlank()) {
                continue;
            }

            Path target = versionDir.resolve(originalFilename);

            try {
                file.transferTo(target.toFile());
            } catch (IOException e) {
                throw new RuntimeException("파일 저장에 실패했습니다: " + originalFilename, e);
            }

            Asset asset = Asset.builder()
                    .name(originalFilename)        // 파일 이름
                    .storageUri(target.toString())      // 실제 경로
                    .build();
            asset.setDatasetVersion(version);
            assetRepository.save(asset);
        }

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
}
