package com.flowmind.domain.evaluation.dto;

public record StartEvaluationRequest(
        Integer trainingJobId,
        Integer datasetVersionId,
        Integer testSplit
) {}
