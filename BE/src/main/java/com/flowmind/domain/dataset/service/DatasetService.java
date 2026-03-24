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
import com.flowmind.domain.dataset.entity.Annotation;
import com.flowmind.domain.dataset.entity.Asset;
import com.flowmind.domain.dataset.entity.Dataset;
import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.entity.LabelClass;
import com.flowmind.domain.dataset.repository.AnnotationRepository;
import com.flowmind.domain.dataset.repository.AssetRepository;
import com.flowmind.domain.dataset.repository.DatasetRepository;
import com.flowmind.domain.dataset.repository.DatasetVersionRepository;
import com.flowmind.domain.dataset.repository.LabelClassRepository;
import com.flowmind.domain.project.entity.Project;
import com.flowmind.domain.project.repository.ProjectRepository;
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
    private final AnnotationRepository annotationRepository;
    private final LabelClassRepository labelClassRepository;
    private final ProjectRepository projectRepository;
    private final CurrentUserProvider currentUserProvider;

    @Value("${app.dataset.root-path}")
    private String datasetRootPath;

    public DatasetVersion createDatasetWithV0(String datasetName, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("업로드할 이미지가 없습니다.");
        }

        User user = currentUserProvider.getCurrentUser();

        Project project = projectRepository.findFirstByUserIdOrderByProjectIdAsc(user.getUserId())
                .orElseGet(() -> projectRepository.save(Project.builder()
                        .name("default")
                        .description("auto-created default project")
                        .userId(user.getUserId())
                        .build()));

        Dataset dataset = Dataset.builder()
                .name(datasetName)
                .projectId(project.getProjectId())
                .userId(user.getUserId())
                .build();
        datasetRepository.save(dataset);

        DatasetVersion version = DatasetVersion.builder()
                .versionTag("v0")
                .build();
        version.setDataset(dataset);
        datasetVersionRepository.save(version);

        Path versionDir = Paths.get(datasetRootPath, datasetName, "v0").toAbsolutePath().normalize();
        try {
            Files.createDirectories(versionDir);
        } catch (IOException e) {
            throw new RuntimeException("데이터셋 디렉토리를 생성할 수 없습니다: " + versionDir, e);
        }

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
                    .name(originalFilename)
                    .storageUri(target.toString())
                    .build();
            asset.setDatasetVersion(version);
            assetRepository.save(asset);
        }

        return version;
    }

    public DatasetDetailResponse getDatasetDetail(Integer datasetId, String versionTag, Integer userId) {
        DatasetVersion version = datasetVersionRepository
                .findByDatasetIdAndVersionAndUser(datasetId, versionTag, userId)
                .orElseThrow(() -> new IllegalArgumentException("데이터셋 또는 버전을 찾을 수 없습니다."));

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
                version.getStatus().name(),
                version.getCreatedAt().toString(),
                version.getDataset().getDescription(),
                imageDtos
        );
    }

    public List<DatasetResponse> getDatasetsWithVersions(Integer userId) {
        List<Dataset> datasets = datasetRepository.findByUserId(userId);
        return datasets.stream().map(DatasetResponse::from).toList();
    }

    /**
     * Self-Annotation 결과를 DB에 저장 (기존 annotation 대체)
     * request: [ { imageId, annotations: [ { label, x, y, width, height } ] } ]
     */
    public void saveAnnotations(Integer datasetVersionId, List<SaveAnnotationRequest> requests) {
        DatasetVersion version = datasetVersionRepository.findById(datasetVersionId)
                .orElseThrow(() -> new IllegalArgumentException("버전을 찾을 수 없습니다: " + datasetVersionId));

        if (version.getStatus() == DatasetVersion.Status.FINALIZED) {
            throw new IllegalStateException("확정된 버전은 수정할 수 없습니다. 새 버전을 생성하세요.");
        }

        for (SaveAnnotationRequest req : requests) {
            Asset asset = assetRepository.findById(req.imageId())
                    .orElseThrow(() -> new IllegalArgumentException("이미지를 찾을 수 없습니다: " + req.imageId()));

            // 기존 어노테이션 삭제
            annotationRepository.deleteByAsset(asset);

            // 새 어노테이션 저장
            for (SaveAnnotationRequest.AnnItem item : req.annotations()) {
                // label_class: 없으면 새로 생성
                LabelClass labelClass = labelClassRepository
                        .findByNameAndDatasetVersion(item.label(), version)
                        .orElseGet(() -> labelClassRepository.save(
                                LabelClass.builder()
                                        .name(item.label())
                                        .datasetVersion(version)
                                        .build()
                        ));

                annotationRepository.save(Annotation.builder()
                        .asset(asset)
                        .labelClass(labelClass)
                        .xCenter(item.x())
                        .yCenter(item.y())
                        .width(item.width())
                        .height(item.height())
                        .build());
            }
        }
    }

    public record SaveAnnotationRequest(
            Integer imageId,
            List<AnnItem> annotations
    ) {
        public record AnnItem(String label, double x, double y, double width, double height) {}
    }

    /**
     * 버전 확정: 사용자가 입력한 versionTag로 변경하고 FINALIZED 상태로 전환
     */
    public FinalizeVersionResponse finalizeVersion(Integer versionId, String newTag) {
        DatasetVersion version = datasetVersionRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("버전을 찾을 수 없습니다: " + versionId));

        if (version.getStatus() == DatasetVersion.Status.FINALIZED) {
            throw new IllegalStateException("이미 확정된 버전입니다.");
        }

        version.finalize(newTag);
        datasetVersionRepository.save(version);

        return new FinalizeVersionResponse(version.getDatasetVersionId(), version.getVersionTag(), version.getStatus().name());
    }

    public record FinalizeVersionResponse(Integer versionId, String versionTag, String status) {}

    /**
     * FINALIZED 버전 기준으로 새 DRAFT 버전 생성 (기존 이미지 복사)
     * withAnnotations=true 이면 어노테이션도 복사
     */
    public CreateDatasetVersionResponse createNewVersionFrom(Integer sourceVersionId, boolean withAnnotations) {
        DatasetVersion source = datasetVersionRepository.findById(sourceVersionId)
                .orElseThrow(() -> new IllegalArgumentException("버전을 찾을 수 없습니다: " + sourceVersionId));

        String newTag = "draft-" + System.currentTimeMillis();

        DatasetVersion newVersion = DatasetVersion.builder()
                .dataset(source.getDataset())
                .versionTag(newTag)
                .status(DatasetVersion.Status.DRAFT)
                .build();
        datasetVersionRepository.save(newVersion);

        List<Asset> sourceAssets = assetRepository.findWithAnnotationsByDatasetVersion(source);
        for (Asset a : sourceAssets) {
            Asset copy = Asset.builder()
                    .name(a.getName())
                    .storageUri(a.getStorageUri())
                    .build();
            copy.setDatasetVersion(newVersion);
            assetRepository.save(copy);

            if (withAnnotations) {
                for (Annotation ann : a.getAnnotations()) {
                    // label_class는 새 버전에 복사 생성
                    LabelClass newLabel = labelClassRepository
                            .findByNameAndDatasetVersion(ann.getLabelClass().getName(), newVersion)
                            .orElseGet(() -> labelClassRepository.save(
                                    LabelClass.builder()
                                            .name(ann.getLabelClass().getName())
                                            .datasetVersion(newVersion)
                                            .build()
                            ));
                    annotationRepository.save(Annotation.builder()
                            .asset(copy)
                            .labelClass(newLabel)
                            .xCenter(ann.getXCenter())
                            .yCenter(ann.getYCenter())
                            .width(ann.getWidth())
                            .height(ann.getHeight())
                            .build());
                }
            }
        }

        return new CreateDatasetVersionResponse(newVersion.getDatasetVersionId(), newVersion.getVersionTag());
    }

    public record CreateDatasetVersionResponse(Integer versionId, String versionTag) {}

    /**
     * 버전 전체 삭제 (이미지 + 어노테이션 포함)
     */
    public void deleteVersion(Integer versionId) {
        DatasetVersion version = datasetVersionRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("버전을 찾을 수 없습니다: " + versionId));

        // 각 Asset의 어노테이션 먼저 삭제
        List<Asset> assets = assetRepository.findWithAnnotationsByDatasetVersion(version);
        for (Asset asset : assets) {
            annotationRepository.deleteByAsset(asset);
        }
        assetRepository.deleteAll(assets);
        datasetVersionRepository.delete(version);
    }

    /**
     * Asset(이미지) 삭제 — FINALIZED 버전은 차단
     */
    public void deleteAsset(Integer assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException("이미지를 찾을 수 없습니다: " + assetId));

        if (asset.getDatasetVersion().getStatus() == DatasetVersion.Status.FINALIZED) {
            throw new IllegalStateException("확정된 버전의 이미지는 삭제할 수 없습니다.");
        }

        annotationRepository.deleteByAsset(asset);
        assetRepository.delete(asset);
    }

    /**
     * 기존 데이터셋 버전에 이미지 추가
     */
    public void addImagesToVersion(String datasetName, String versionTag, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return;

        User user = currentUserProvider.getCurrentUser();

        Dataset dataset = datasetRepository.findByNameAndUserId(datasetName, user.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("데이터셋을 찾을 수 없습니다: " + datasetName));

        DatasetVersion version = datasetVersionRepository
                .findByDatasetIdAndVersionAndUser(dataset.getDatasetId(), versionTag, user.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("버전을 찾을 수 없습니다: " + versionTag));

        if (version.getStatus() == DatasetVersion.Status.FINALIZED) {
            throw new IllegalStateException("확정된 버전은 수정할 수 없습니다. 새 버전을 생성하세요.");
        }

        Path versionDir = Paths.get(datasetRootPath, datasetName, versionTag).toAbsolutePath().normalize();
        try {
            Files.createDirectories(versionDir);
        } catch (IOException e) {
            throw new RuntimeException("디렉토리 생성 실패: " + versionDir, e);
        }

        for (MultipartFile file : files) {
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isBlank()) continue;

            Path target = versionDir.resolve(originalFilename);
            try {
                file.transferTo(target.toFile());
            } catch (IOException e) {
                throw new RuntimeException("파일 저장 실패: " + originalFilename, e);
            }

            Asset asset = Asset.builder()
                    .name(originalFilename)
                    .storageUri(target.toString())
                    .build();
            asset.setDatasetVersion(version);
            assetRepository.save(asset);
        }
    }
}
