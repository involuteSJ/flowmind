package com.flowmind.domain.dataset.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "asset")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long assetId;

    // 이미지 파일 이름 (예: cat1.png)
    @Column(nullable = false)
    private String name;

    // 실제 파일 경로 (옵션이지만 있으면 편함)
    @Column(name = "storage_uri")
    private String storageUri;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_version_id", nullable = false)
    private DatasetVersion datasetVersion;

    public void setDatasetVersion(DatasetVersion datasetVersion) {
        this.datasetVersion = datasetVersion;
    }
}
