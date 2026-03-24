package com.flowmind.domain.evaluation.dto;

import com.flowmind.domain.evaluation.entity.EvaluationJob;

public record EvaluationJobResponse(
        Integer evalId,
        Integer trainingJobId,
        String modelName,
        Integer datasetVersionId,
        String datasetName,
        String versionTag,
        Integer testSplit,
        String status,
        Integer progress,
        Double metricPrecision,
        Double metricRecall,
        Double metricMap50,
        Double metricMap5095,
        String errorMsg,
        String createdAt
) {
    public static EvaluationJobResponse from(EvaluationJob job) {
        return new EvaluationJobResponse(
                job.getEvalId(),
                job.getTrainingJobId(),
                job.getModelName(),
                job.getDatasetVersionId(),
                job.getDatasetName(),
                job.getVersionTag(),
                job.getTestSplit(),
                job.getStatus().name(),
                job.getProgress(),
                job.getMetricPrecision(),
                job.getMetricRecall(),
                job.getMetricMap50(),
                job.getMetricMap5095(),
                job.getErrorMsg(),
                job.getCreatedAt() != null ? job.getCreatedAt().toString() : null
        );
    }
}
