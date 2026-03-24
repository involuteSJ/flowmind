package com.flowmind.domain.dataset.dto;

import java.util.List;

public record DatasetDetailResponse(
        Integer id,
        String name,
        String version,
        String versionStatus,
        String createdAt,
        String description,
        List<ImageWithAnnotationsDto> images
) {}
