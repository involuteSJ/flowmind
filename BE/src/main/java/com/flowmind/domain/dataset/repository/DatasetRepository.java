package com.flowmind.domain.dataset.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.dataset.entity.Dataset;

public interface DatasetRepository extends JpaRepository<Dataset, Integer> {
    List<Dataset> findByUserId(Integer userId);
    Optional<Dataset> findByNameAndUserId(String name, Integer userId);
}
