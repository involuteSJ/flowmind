package com.flowmind.domain.dataset.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.dataset.entity.Annotation;
import com.flowmind.domain.dataset.entity.Asset;

public interface AnnotationRepository extends JpaRepository<Annotation, Long> {

    List<Annotation> findByAsset(Asset asset);

    void deleteByAsset(Asset asset);
}