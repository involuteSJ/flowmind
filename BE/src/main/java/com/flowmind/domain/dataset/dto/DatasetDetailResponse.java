package com.flowmind.domain.dataset.dto;

import java.util.List;

public record DatasetDetailResponse(
        Long id,
        String name,
        String version,
        String createdAt,
        String description,
        List<ImageWithAnnotationsDto> images
) {}