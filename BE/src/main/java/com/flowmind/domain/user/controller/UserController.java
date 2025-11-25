package com.flowmind.domain.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.flowmind.domain.user.dto.LoginRequest;
import com.flowmind.domain.user.dto.SignupRequest;
import com.flowmind.domain.user.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserController {
	private final UserService userService;
	
	@PostMapping("/signup")
	public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request) {
		Long userId = userService.signup(request);
		return ResponseEntity.ok().body(
			new SignupResponse(userId, "회원가입이 완료되었습니다")
		);
	}
	
	@PostMapping("/login")
	public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
		UserService.LoginResult loginResult = userService.login(request);
		return ResponseEntity.ok(loginResult);
	}
	
	record SignupResponse(Long id, String message) {}
}
