package com.flowmind.domain.dataset.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.dataset.entity.DatasetVersion;
import com.flowmind.domain.dataset.entity.LabelClass;
import com.flowmind.domain.dataset.entity.LabelClassId;

public interface LabelClassRepository extends JpaRepository<LabelClass, LabelClassId> {

 List<LabelClass> findByDatasetVersion(DatasetVersion version);

 Optional<LabelClass> findByDatasetVersionAndName(DatasetVersion version, String name);
}
