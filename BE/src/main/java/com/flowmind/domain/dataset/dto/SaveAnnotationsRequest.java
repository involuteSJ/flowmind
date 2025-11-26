package com.flowmind.domain.dataset.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SaveAnnotationsRequest {

    // JSON: "datasetId": 10
    @JsonProperty("datasetId")
    private Long datasetId;         

    // JSON: "versionTag": "v1"
    // 내부에서는 그대로 version 으로 사용
    @JsonProperty("versionTag")
    private String version;        

    // JSON: "annotations": [ { "imageId": 19, "annotations": [...] }, ... ]
    private List<ImageAnnotationsPayload> annotations;

    @Getter
    @Setter
    public static class ImageAnnotationsPayload {

        // JSON: "imageId": 19
        @JsonProperty("imageId")
        private Long imageId;

        // JSON: "annotations": [ ... ]
        @JsonProperty("annotations")
        private List<AnnotationPayload> annotations;
    }

    @Getter
    @Setter
    public static class AnnotationPayload {

        // 사용 안 해도 상관 없음
        private String id;

        @JsonProperty("xCenter")
        private double xCenter;

        @JsonProperty("yCenter")
        private double yCenter;

        private double width;
        private double height;
        private String label;   // "dog", "person"
    }
}
