package com.flowmind.domain.dataset.dto;

import java.util.List;

public record AnnotationDto(
        Long id,
        String label,
        double xCenter,
        double yCenter,
        double width,
        double height
) {}