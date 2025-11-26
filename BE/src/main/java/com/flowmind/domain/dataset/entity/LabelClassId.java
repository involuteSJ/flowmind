package com.flowmind.domain.dataset.entity;

import java.io.Serializable;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LabelClassId implements Serializable {
    private Integer classId;
    private Long datasetVersion;   // DatasetVersion의 PK 타입(Long)과 맞춰줌
}