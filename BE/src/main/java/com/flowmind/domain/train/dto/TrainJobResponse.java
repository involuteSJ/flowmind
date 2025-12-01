package com.flowmind.domain.train.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class TrainJobResponse {

    private Long jobId;
    private String status;        // QUEUED, RUNNING, SUCCESS, FAILED
    private String resultModelPath;

    public TrainJobResponse(Long jobId, String status) {
        this.jobId = jobId;
        this.status = status;
        this.resultModelPath = null;
    }
}
