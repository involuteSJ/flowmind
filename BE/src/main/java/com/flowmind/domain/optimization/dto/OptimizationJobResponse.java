package com.flowmind.domain.optimization.dto;

import com.flowmind.domain.optimization.entity.OptimizationJob;
import java.nio.file.Paths;

public record OptimizationJobResponse(
        Integer optId,
        Integer trainingJobId,
        String sourceModelName,
        String datasetName,
        String versionTag,
        String format,
        Integer imgSize,
        Boolean halfPrecision,
        Boolean dynamic,
        Boolean simplify,
        Integer opset,
        Integer workspace,
        String status,
        Integer progress,
        String outputFilename,   // 파일명만 노출 (전체 경로 숨김)
        Double outputSizeMb,
        String errorMsg,
        String createdAt
) {
    public static OptimizationJobResponse from(OptimizationJob job) {
        String filename = null;
        if (job.getOutputPath() != null) {
            filename = Paths.get(job.getOutputPath()).getFileName().toString();
        }
        return new OptimizationJobResponse(
                job.getOptId(),
                job.getTrainingJobId(),
                job.getSourceModelName(),
                job.getDatasetName(),
                job.getVersionTag(),
                job.getFormat().name(),
                job.getImgSize(),
                job.getHalfPrecision(),
                job.getDynamic(),
                job.getSimplify(),
                job.getOpset(),
                job.getWorkspace(),
                job.getStatus().name(),
                job.getProgress(),
                filename,
                job.getOutputSizeMb(),
                job.getErrorMsg(),
                job.getCreatedAt() != null ? job.getCreatedAt().toString() : null
        );
    }
}
