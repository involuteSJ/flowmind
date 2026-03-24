package com.flowmind.domain.evaluation.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_job")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class EvaluationJob {

    public enum Status { PENDING, RUNNING, COMPLETED, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "eval_id")
    private Integer evalId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "training_job_id", nullable = false)
    private Integer trainingJobId;

    @Column(name = "model_name", length = 200)
    private String modelName;

    @Column(name = "dataset_version_id", nullable = false)
    private Integer datasetVersionId;

    @Column(name = "dataset_name", length = 100)
    private String datasetName;

    @Column(name = "version_tag", length = 50)
    private String versionTag;

    @Column(name = "test_split")
    private Integer testSplit;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "progress")
    @Builder.Default
    private Integer progress = 0;

    // 결과 메트릭
    @Column(name = "metric_precision")
    private Double metricPrecision;

    @Column(name = "metric_recall")
    private Double metricRecall;

    @Column(name = "metric_map50")
    private Double metricMap50;

    @Column(name = "metric_map5095")
    private Double metricMap5095;

    @Column(name = "error_msg", columnDefinition = "TEXT")
    private String errorMsg;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateProgress(int progress) {
        this.progress = progress;
        this.status = Status.RUNNING;
    }

    public void complete(Double precision, Double recall, Double map50, Double map5095) {
        this.metricPrecision = precision;
        this.metricRecall = recall;
        this.metricMap50 = map50;
        this.metricMap5095 = map5095;
        this.status = Status.COMPLETED;
        this.progress = 100;
    }

    public void fail(String errorMsg) {
        this.errorMsg = errorMsg;
        this.status = Status.FAILED;
    }
}
