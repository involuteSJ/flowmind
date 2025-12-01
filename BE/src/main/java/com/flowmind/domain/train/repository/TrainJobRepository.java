package com.flowmind.domain.train.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.train.entity.TrainJob;

public interface TrainJobRepository extends JpaRepository<TrainJob, Long> {

    Optional<TrainJob> findByIdAndUserId(Long id, Long userId);
}
