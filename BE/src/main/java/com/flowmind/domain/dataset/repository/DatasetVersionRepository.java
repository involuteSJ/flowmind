package com.flowmind.domain.dataset.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.dataset.entity.DatasetVersion;

public interface DatasetVersionRepository extends JpaRepository<DatasetVersion, Long>{

}
