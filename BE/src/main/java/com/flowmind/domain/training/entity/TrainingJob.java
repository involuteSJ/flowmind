package com.flowmind.domain.training.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "training_job")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class TrainingJob {

    public enum Status { PENDING, RUNNING, COMPLETED, FAILED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "job_id")
    private Integer jobId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "version_id", nullable = false)
    private Integer versionId;

    @Column(name = "model_type", length = 20)
    private String modelType;

    @Column(name = "model_size", length = 5)
    private String modelSize;

    @Column(name = "dataset_name", length = 100)
    private String datasetName;

    @Column(name = "version_tag", length = 50)
    private String versionTag;

    private Integer epochs;

    @Column(name = "batch_size")
    private Integer batchSize;

    @Column(name = "learning_rate")
    private Double learningRate;

    @Column(length = 20)
    private String optimizer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Builder.Default
    private Integer progress = 0;

    @Column(name = "model_path", columnDefinition = "TEXT")
    private String modelPath;

    @Column(name = "model_name", length = 200)
    private String modelName;

    @Column(name = "model_version")
    private Integer modelVersion;

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
        if (this.status == null) this.status = Status.PENDING;
        if (this.progress == null) this.progress = 0;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void updateProgress(int progress) {
        this.progress = progress;
        this.status = Status.RUNNING;
    }

    public void complete(String modelPath, String modelName, int modelVersion) {
        this.modelPath = modelPath;
        this.modelName = modelName;
        this.modelVersion = modelVersion;
        this.status = Status.COMPLETED;
        this.progress = 100;
    }

    public void fail(String errorMsg) {
        this.errorMsg = errorMsg;
        this.status = Status.FAILED;
    }

    public void cancel() {
        this.status = Status.CANCELLED;
    }
}
