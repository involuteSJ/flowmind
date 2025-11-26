package com.flowmind.domain.dataset.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "annotation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Annotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "annotation_id")
    private Long annotationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
        @JoinColumn(name = "class_id", referencedColumnName = "class_id"),
        @JoinColumn(name = "dataset_version_id", referencedColumnName = "dataset_version_id")
    })
    private LabelClass labelClass;
    
    @Column(name = "storage_uri")
    private String storageUri;

    @Column(name = "x_center", nullable = false)
    private Double xCenter;

    @Column(name = "y_center", nullable = false)
    private Double yCenter;

    @Column(name = "width", nullable = false)
    private Double width;

    @Column(name = "height", nullable = false)
    private Double height;
}
