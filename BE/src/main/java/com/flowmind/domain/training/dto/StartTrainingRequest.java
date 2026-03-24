package com.flowmind.domain.training.dto;

public record StartTrainingRequest(
        Integer datasetVersionId,
        String modelType,
        String modelSize,
        Integer epochs,
        Integer batchSize,
        Double learningRate,
        String optimizer
) {}
