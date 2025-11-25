package com.flowmind.domain.dataset.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowmind.domain.dataset.entity.DatasetVersion;

public interface DatasetVersionRepository extends JpaRepository<DatasetVersion, Long>{
	@Query("""
        SELECT dv
        FROM DatasetVersion dv
        JOIN dv.dataset d
        WHERE d.datasetId = :datasetId
          AND dv.versionTag = :versionTag
          AND d.userId = :userId
    """)
    Optional<DatasetVersion> findByDatasetIdAndVersionAndUser(
            @Param("datasetId") Long datasetId,
            @Param("versionTag") String versionTag,
            @Param("userId") Long userId
    );
}
