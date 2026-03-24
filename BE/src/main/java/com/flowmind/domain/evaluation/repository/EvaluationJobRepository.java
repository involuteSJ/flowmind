package com.flowmind.domain.evaluation.repository;

import com.flowmind.domain.evaluation.entity.EvaluationJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluationJobRepository extends JpaRepository<EvaluationJob, Integer> {
    List<EvaluationJob> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
