package com.flowmind.domain.dataset.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dataset_version")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DatasetVersion {

    public enum Status { DRAFT, FINALIZED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dataset_version_id")
    private Integer datasetVersionId;

    @Column(nullable = false, length = 50)
    private String versionTag;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id", nullable = false)
    private Dataset dataset;

    @OneToMany(mappedBy = "datasetVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Asset> assets = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) this.status = Status.DRAFT;
    }

    public void setDataset(Dataset dataset) {
        this.dataset = dataset;
    }

    public void addAsset(Asset asset) {
        assets.add(asset);
        asset.setDatasetVersion(this);
    }

    public void finalize(String newTag) {
        this.versionTag = newTag;
        this.status = Status.FINALIZED;
    }
}
