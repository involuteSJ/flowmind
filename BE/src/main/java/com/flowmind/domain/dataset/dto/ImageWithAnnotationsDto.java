package com.flowmind.domain.dataset.dto;

import java.util.List;

public record ImageWithAnnotationsDto(
        Integer id,
        String filename,
        String imageUrl,
        List<AnnotationDto> annotations
) {}
