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

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long datasetVersionId;

    // v0, v1, ...
    @Column(nullable = false, length = 20)
    private String versionTag;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id", nullable = false)
    private Dataset dataset;

    @OneToMany(mappedBy = "datasetVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Asset> assets = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public void setDataset(Dataset dataset) {
        this.dataset = dataset;
    }

    public void addAsset(Asset asset) {
        assets.add(asset);
        asset.setDatasetVersion(this);
    }
}
