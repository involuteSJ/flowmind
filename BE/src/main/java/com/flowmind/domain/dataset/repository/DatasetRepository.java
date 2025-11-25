package com.flowmind.domain.dataset.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.query.Param;

import com.flowmind.domain.dataset.entity.Dataset;

public interface DatasetRepository extends JpaRepository<Dataset, Long>{
	List<Dataset> findByUserId(Long userId);
}
