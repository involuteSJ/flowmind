package com.flowmind.domain.optimization.dto;

public record StartOptimizationRequest(
        Integer trainingJobId,
        String format,       // "ONNX" | "ENGINE"
        Integer imgSize,
        Boolean halfPrecision,
        // ONNX
        Boolean dynamic,
        Boolean simplify,
        Integer opset,
        // ENGINE
        Integer workspace
) {}
