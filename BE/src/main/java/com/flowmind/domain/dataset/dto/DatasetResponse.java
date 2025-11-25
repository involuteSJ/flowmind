package com.flowmind.domain.dataset.dto;

import java.util.List;

import com.flowmind.domain.dataset.entity.Dataset;

public record DatasetResponse(
        Long id,
        String name,
        List<DatasetVersionResponse> versions
) {
    public static DatasetResponse from(Dataset dataset) {
        List<DatasetVersionResponse> versions = dataset.getVersions()
                .stream()
                .map(DatasetVersionResponse::from)
                .toList();

        return new DatasetResponse(
                dataset.getDatasetId(),
                dataset.getName(),
                versions
        );
    }
}