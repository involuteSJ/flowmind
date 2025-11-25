package com.flowmind.domain.dataset.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.dataset.entity.Asset;

public interface AssetRepository extends JpaRepository<Asset, Long>{

}
