package com.flowmind.domain.dataset.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.flowmind.domain.dataset.entity.Annotation;
import com.flowmind.domain.dataset.entity.Asset;

public interface AnnotationRepository extends JpaRepository<Annotation, Integer> {

    List<Annotation> findByAsset(Asset asset);

    @Modifying
    @Query("DELETE FROM Annotation a WHERE a.asset = :asset")
    void deleteByAsset(@Param("asset") Asset asset);
}
