package com.flowmind.domain.training.dto;

import com.flowmind.domain.training.entity.TrainingJob;

public record TrainingJobResponse(
        Integer jobId,
        Integer versionId,
        String datasetName,
        String versionTag,
        String modelType,
        String modelSize,
        Integer epochs,
        Integer batchSize,
        Double learningRate,
        String optimizer,
        String status,
        Integer progress,
        String modelPath,
        String modelName,
        Integer modelVersion,
        String errorMsg,
        String createdAt
) {
    public static TrainingJobResponse from(TrainingJob job, String datasetName, String versionTag) {
        return new TrainingJobResponse(
                job.getJobId(),
                job.getVersionId(),
                datasetName,
                versionTag,
                job.getModelType(),
                job.getModelSize(),
                job.getEpochs(),
                job.getBatchSize(),
                job.getLearningRate(),
                job.getOptimizer(),
                job.getStatus().name(),
                job.getProgress(),
                job.getModelPath(),
                job.getModelName(),
                job.getModelVersion(),
                job.getErrorMsg(),
                job.getCreatedAt() != null ? job.getCreatedAt().toString() : null
        );
    }

    public static TrainingJobResponse from(TrainingJob job) {
        return from(job, null, null);
    }
}
