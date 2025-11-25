package com.flowmind.domain.dataset.dto;

import java.util.List;

public record ImageWithAnnotationsDto(
        Long id,
        String filename,
        String imageUrl,              // 실제 이미지 요청용 URL
        List<AnnotationDto> annotations
) {}