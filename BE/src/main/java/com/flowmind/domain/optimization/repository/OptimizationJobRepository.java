package com.flowmind.domain.optimization.repository;

import com.flowmind.domain.optimization.entity.OptimizationJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OptimizationJobRepository extends JpaRepository<OptimizationJob, Integer> {
    List<OptimizationJob> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
