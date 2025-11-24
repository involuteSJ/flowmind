package com.flowmind.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.flowmind.dto.LoginRequest;
import com.flowmind.dto.SignupRequest;
import com.flowmind.entity.User;
import com.flowmind.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
	private final UserRepository userRepository;
	private final PasswordEncoder  passwordEncoder;
	
	public Long signup(SignupRequest request) {
		if(!request.getPassword().equals(request.getPasswordCheck())) {
			throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다");
		}
		
		if(userRepository.existsByEmail(request.getEmail())) {
			throw new IllegalArgumentException("이미 사용중인 이메일입니다");
		} 
		
		String encodedPassword = passwordEncoder.encode(request.getPassword());
		
		User user = User.builder()
				.email(request.getEmail())
				.name(request.getName())
				.phone(request.getPhone())
				.password(encodedPassword)
				.build();
		
		User saved = userRepository.save(user);
		return saved.getUserId();
	}
	
	public LoginResult login(LoginRequest request) {
		User user = userRepository.findByEmail(request.getEmail())
				.orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 일치하지 않습니다"));
		
		if(!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
			throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다");
		}
		
		return new LoginResult(user.getUserId(), user.getEmail(), user.getName());
	}
	
	public record LoginResult(Long id, String email, String name) {}
}
