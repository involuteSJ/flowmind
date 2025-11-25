package com.flowmind.domain.dataset.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowmind.domain.dataset.entity.Asset;
import com.flowmind.domain.dataset.entity.DatasetVersion;

public interface AssetRepository extends JpaRepository<Asset, Long>{
	@Query("""
        SELECT DISTINCT a
        FROM Asset a
        LEFT JOIN FETCH a.annotations ann
        LEFT JOIN FETCH ann.labelClass cls
        WHERE a.datasetVersion = :version
    """)
    List<Asset> findWithAnnotationsByDatasetVersion(@Param("version") DatasetVersion version);
}
