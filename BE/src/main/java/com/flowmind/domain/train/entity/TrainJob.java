package com.flowmind.domain.train.entity;

import java.time.LocalDateTime;

import com.flowmind.domain.dataset.entity.DatasetVersion;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "train_job")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 유저가 실행한 학습인지
    private Long userId;

    // 어떤 dataset_version을 사용했는지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_version_id")
    private DatasetVersion datasetVersion;

    // 모델 스펙
    private String modelType;   // object-detection 등
    private String modelBase;   // yolov8, yolo11 ...
    private String modelSize;   // n, s, m, l, x

    // 하이퍼파라미터
    private Integer epochs;
    private Integer batchSize;
    private Double learningRate;
    private String optimizer;

    @Enumerated(EnumType.STRING)
    private TrainJobStatus status; // QUEUED, RUNNING, SUCCESS, FAILED

    // GPU가 알려준 모델 파일 경로 (S3 or 로컬)
    private String resultModelPath;

    // 실패 시 에러 메시지
    private String errorMessage;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
