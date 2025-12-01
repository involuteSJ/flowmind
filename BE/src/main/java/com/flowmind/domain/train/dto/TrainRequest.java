package com.flowmind.domain.train.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainRequest {

    private Long datasetId;
    private String datasetVersion; // 예: "v2"

    private ModelSpec model;
    private Hyperparams hyperparams;

    @Getter
    @Setter
    public static class ModelSpec {
        private String type; // 예: "object-detection"
        private String base; // 예: "yolov8"
        private String size; // 예: "n"
    }

    @Getter
    @Setter
    public static class Hyperparams {
        private int epochs;
        private int batchSize;
        private double learningRate;
        private String optimizer;
    }
}
