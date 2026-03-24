package com.flowmind.domain.training.repository;

import com.flowmind.domain.training.entity.TrainingJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingJobRepository extends JpaRepository<TrainingJob, Integer> {
    List<TrainingJob> findByUserIdOrderByCreatedAtDesc(Integer userId);
}
