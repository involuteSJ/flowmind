package com.flowmind.domain.dataset.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.flowmind.domain.dataset.dto.DatasetDetailResponse;
import com.flowmind.domain.dataset.dto.DatasetResponse;
import com.flowmind.domain.dataset.entity.Asset;
import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.repository.AssetRepository;
import com.flowmind.domain.dataset.service.DatasetService;
import com.flowmind.domain.user.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/datasets")
@RequiredArgsConstructor
public class DatasetController {

    private final DatasetService datasetService;
    private final UserService userService;
    private final AssetRepository assetRepository;

    @PostMapping(
            value = "/new",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<?> createDataset(
            @RequestParam("name") String name,
            @RequestPart("images") List<MultipartFile> images
    ) {
        DatasetVersion version = datasetService.createDatasetWithV0(name, images);

        return ResponseEntity.ok(new CreateDatasetResponse(
                version.getDataset().getDatasetId(),
                version.getDatasetVersionId(),
                version.getVersionTag()
        ));
    }
    
    @GetMapping("/all")
    public ResponseEntity<?> getUserDatasets(@AuthenticationPrincipal String email) {
        // email로 userId 조회
    	Long userId = userService.findUserIdByEmail(email);

        List<DatasetResponse> responses = datasetService.getDatasetsWithVersions(userId);
        return ResponseEntity.ok(responses);
    }
    
    @GetMapping("/detail")
    public ResponseEntity<DatasetDetailResponse> getDatasetDetail(
            @RequestParam Long datasetId,
            @RequestParam String version,
            @AuthenticationPrincipal String email
    ) {
        Long userId = userService.findUserIdByEmail(email);
        DatasetDetailResponse response = datasetService.getDatasetDetail(datasetId, version, userId);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/assets/{assetId}/image")
    public ResponseEntity<Resource> getAssetImage(@PathVariable Long assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        FileSystemResource resource = new FileSystemResource(asset.getStorageUri());

        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        // 간단히 jpg로 가정, 필요하면 MediaType을 확장자에 따라 계산
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(resource);
    }

    public record CreateDatasetResponse(Long datasetId, Long versionId, String versionTag) {}
}
