package com.flowmind.domain.dataset.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.flowmind.domain.user.entity.User;

@Entity
@Table(name = "dataset")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Dataset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long datasetId;

    @Column(nullable = false, length = 100)
    private String name;

    // 어떤 유저의 데이터셋인지
    @Column(name="user_id", nullable=false)
    private Long userId;

    @OneToMany(mappedBy = "dataset", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DatasetVersion> versions = new ArrayList<>();

    public void addVersion(DatasetVersion version) {
        versions.add(version);
        version.setDataset(this);
    }
}
