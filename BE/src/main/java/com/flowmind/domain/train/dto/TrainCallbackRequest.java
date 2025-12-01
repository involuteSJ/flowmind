package com.flowmind.domain.train.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TrainCallbackRequest {
    private Long jobId;
    private String status;          // "SUCCESS" or "FAILED"
    private String resultModelPath; // 예: "s3://bucket/models/xxx.pt"
    private String errorMessage;    // 실패 시 에러 메시지
}
