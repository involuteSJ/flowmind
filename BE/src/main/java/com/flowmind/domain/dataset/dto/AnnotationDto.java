package com.flowmind.domain.dataset.dto;

public record AnnotationDto(
        Integer id,
        String label,
        double xCenter,
        double yCenter,
        double width,
        double height
) {}
