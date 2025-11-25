package com.flowmind.domain.user.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.flowmind.domain.user.entity.User;

public interface UserRepository extends JpaRepository<User, Long>{
	boolean existsByEmail(String email);
	boolean existsByPhone(String phone);
	
	Optional<User> findByEmail(String email);
}
