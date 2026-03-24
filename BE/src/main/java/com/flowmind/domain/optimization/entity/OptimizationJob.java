package com.flowmind.domain.optimization.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "optimization_job")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OptimizationJob {

    public enum Status { PENDING, RUNNING, COMPLETED, FAILED }
    public enum Format { ONNX, ENGINE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "opt_id")
    private Integer optId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "training_job_id", nullable = false)
    private Integer trainingJobId;

    @Column(name = "source_model_name", length = 200)
    private String sourceModelName;

    @Column(name = "dataset_name", length = 100)
    private String datasetName;

    @Column(name = "version_tag", length = 50)
    private String versionTag;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Format format;

    // ONNX / Engine 공통
    @Column(name = "img_size")
    @Builder.Default
    private Integer imgSize = 640;

    @Column(name = "half_precision")
    @Builder.Default
    private Boolean halfPrecision = false;

    // ONNX 전용
    @Column(name = "dynamic")
    @Builder.Default
    private Boolean dynamic = false;

    @Column(name = "simplify")
    @Builder.Default
    private Boolean simplify = true;

    @Column(name = "opset")
    @Builder.Default
    private Integer opset = 12;

    // Engine 전용
    @Column(name = "workspace")
    @Builder.Default
    private Integer workspace = 4;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "progress")
    @Builder.Default
    private Integer progress = 0;

    @Column(name = "output_path", length = 500)
    private String outputPath;

    @Column(name = "output_size_mb")
    private Double outputSizeMb;

    @Column(name = "error_msg", columnDefinition = "TEXT")
    private String errorMsg;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); this.updatedAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public void updateProgress(int progress) { this.progress = progress; this.status = Status.RUNNING; }

    public void complete(String outputPath, Double outputSizeMb) {
        this.outputPath = outputPath;
        this.outputSizeMb = outputSizeMb;
        this.status = Status.COMPLETED;
        this.progress = 100;
    }

    public void fail(String errorMsg) { this.errorMsg = errorMsg; this.status = Status.FAILED; }
}
