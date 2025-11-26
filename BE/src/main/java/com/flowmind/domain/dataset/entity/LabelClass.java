package com.flowmind.domain.dataset.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "label_class")
@Getter
@IdClass(LabelClassId.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class LabelClass {

    @Id
    @Column(name = "class_id")
    private Integer classId;

    @Column(name = "name")
    private String name;

    // 어떤 버전의 클래스인지
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_version_id", nullable = false)
    private DatasetVersion datasetVersion;
}
