package com.flowmind.domain.dataset.controller;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaTypeFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.flowmind.domain.dataset.dto.DatasetDetailResponse;
import com.flowmind.domain.dataset.dto.DatasetResponse;
import com.flowmind.domain.dataset.entity.Asset;
import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.repository.AssetRepository;
import com.flowmind.domain.dataset.service.DatasetService;
import com.flowmind.domain.dataset.service.DatasetService.CreateDatasetVersionResponse;
import com.flowmind.domain.dataset.service.DatasetService.FinalizeVersionResponse;
import com.flowmind.domain.dataset.service.DatasetService.SaveAnnotationRequest;
import com.flowmind.domain.user.service.UserService;

import java.util.List;

import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/datasets")
@RequiredArgsConstructor
public class DatasetController {

    private final DatasetService datasetService;
    private final UserService userService;
    private final AssetRepository assetRepository;

    @PostMapping(value = "/new", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
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
        Integer userId = userService.findUserIdByEmail(email);
        List<DatasetResponse> responses = datasetService.getDatasetsWithVersions(userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/detail")
    public ResponseEntity<DatasetDetailResponse> getDatasetDetail(
            @RequestParam Integer datasetId,
            @RequestParam String version,
            @AuthenticationPrincipal String email
    ) {
        Integer userId = userService.findUserIdByEmail(email);
        DatasetDetailResponse response = datasetService.getDatasetDetail(datasetId, version, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/assets/{assetId}/image")
    public ResponseEntity<Resource> getAssetImage(@PathVariable Integer assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));

        FileSystemResource resource = new FileSystemResource(asset.getStorageUri());
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }

        MediaType mediaType = MediaTypeFactory.getMediaType(asset.getName()).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(mediaType).body(resource);
    }

    @PostMapping(value="/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadImages(
            @RequestParam("datasetName") String datasetName,
            @RequestParam("version") String version,
            @RequestPart("files") List<MultipartFile> files
    ) {
        datasetService.addImagesToVersion(datasetName, version, files);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/datasets/versions/{versionId}/annotations
     * Body: [ { imageId, annotations: [ { label, x, y, width, height } ] } ]
     */
    @PostMapping("/versions/{versionId}/annotations")
    public ResponseEntity<?> saveAnnotations(
            @PathVariable Integer versionId,
            @RequestBody List<SaveAnnotationRequest> requests
    ) {
        datasetService.saveAnnotations(versionId, requests);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/datasets/versions/{versionId}/finalize
     * Body: { "versionTag": "v1.0" }
     */
    @PostMapping("/versions/{versionId}/finalize")
    public ResponseEntity<FinalizeVersionResponse> finalizeVersion(
            @PathVariable Integer versionId,
            @RequestBody FinalizeRequest req
    ) {
        return ResponseEntity.ok(datasetService.finalizeVersion(versionId, req.versionTag()));
    }

    /**
     * DELETE /api/datasets/assets/{assetId}
     * 이미지(Asset) 및 연결된 어노테이션 삭제 (FINALIZED 버전은 불가)
     */
    @DeleteMapping("/assets/{assetId}")
    public ResponseEntity<?> deleteAsset(@PathVariable Integer assetId) {
        datasetService.deleteAsset(assetId);
        return ResponseEntity.noContent().build();
    }

    public record FinalizeRequest(String versionTag) {}

    /**
     * POST /api/datasets/versions/{versionId}/branch?withAnnotations=true|false
     */
    @PostMapping("/versions/{versionId}/branch")
    public ResponseEntity<CreateDatasetVersionResponse> branchVersion(
            @PathVariable Integer versionId,
            @RequestParam(defaultValue = "true") boolean withAnnotations
    ) {
        return ResponseEntity.ok(datasetService.createNewVersionFrom(versionId, withAnnotations));
    }

    /**
     * DELETE /api/datasets/versions/{versionId}
     */
    @DeleteMapping("/versions/{versionId}")
    public ResponseEntity<?> deleteVersion(@PathVariable Integer versionId) {
        datasetService.deleteVersion(versionId);
        return ResponseEntity.noContent().build();
    }

    public record CreateDatasetResponse(Integer datasetId, Integer versionId, String versionTag) {}
}
