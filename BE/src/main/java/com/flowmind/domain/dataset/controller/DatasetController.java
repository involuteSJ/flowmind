package com.flowmind.domain.dataset.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.flowmind.domain.dataset.dto.DatasetResponse;
import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.service.DatasetService;
import com.flowmind.domain.user.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/datasets")
@RequiredArgsConstructor
public class DatasetController {

    private final DatasetService datasetService;
    private final UserService userService;

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

    public record CreateDatasetResponse(Long datasetId, Long versionId, String versionTag) {}
}
