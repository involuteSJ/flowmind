package com.flowmind.domain.user.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.flowmind.domain.user.dto.LoginRequest;
import com.flowmind.domain.user.dto.SignupRequest;
import com.flowmind.domain.user.entity.User;
import com.flowmind.domain.user.repository.UserRepository;
import com.flowmind.security.JwtUtil;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
	private final UserRepository userRepository;
	private final PasswordEncoder  passwordEncoder;
	private final JwtUtil jwtUtil;
	
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
		
		String token = jwtUtil.createToken(user.getUserId(), user.getEmail());

	    return new LoginResult(user.getUserId(), user.getEmail(), user.getName(), token);
	}
	
	public Long findUserIdByEmail(String email) {
	    User user = userRepository.findByEmail(email)
	            .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
	    return user.getUserId();
	}

	
	public record LoginResult(Long id, String email, String name, String token) {}
}
