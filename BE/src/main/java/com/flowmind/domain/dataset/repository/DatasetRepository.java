package com.flowmind.domain.dataset.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.dataset.entity.Dataset;

public interface DatasetRepository extends JpaRepository<Dataset, Long> {

    List<Dataset> findByUserId(Long userId);

    // ★ 추가: 같은 유저 안에서 이름으로 Dataset 찾기
    Optional<Dataset> findByUserIdAndName(Long userId, String name);
}
