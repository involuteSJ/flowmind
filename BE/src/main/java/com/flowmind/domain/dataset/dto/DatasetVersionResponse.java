package com.flowmind.domain.dataset.dto;

import com.flowmind.domain.dataset.entity.DatasetVersion;

public record DatasetVersionResponse(
        Integer id,
        String versionTag,
        String createdAt,
        int assetsCount,
        String status
) {
    public static DatasetVersionResponse from(DatasetVersion version) {
        return new DatasetVersionResponse(
                version.getDatasetVersionId(),
                version.getVersionTag(),
                version.getCreatedAt().toString(),
                version.getAssets().size(),
                version.getStatus().name()
        );
    }
}
