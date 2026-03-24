package com.flowmind.domain.dataset.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.entity.LabelClass;

public interface LabelClassRepository extends JpaRepository<LabelClass, Integer> {
    Optional<LabelClass> findByNameAndDatasetVersion(String name, DatasetVersion datasetVersion);
}
