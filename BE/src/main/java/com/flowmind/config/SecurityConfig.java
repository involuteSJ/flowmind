package com.flowmind.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                // ✅ CORS 필터 사용 (아래 corsConfigurationSource() 를 사용)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // ✅ REST API라 CSRF 비활성화
                .csrf(csrf -> csrf.disable())
                // ✅ 권한 설정
                .authorizeHttpRequests(auth -> auth
                        // 프리플라이트(OPTIONS) 요청은 모두 허용
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // 회원가입/로그인 API는 인증 없이 허용
                        .requestMatchers("/api/auth/**").permitAll()
                        // 그 외는 인증 필요 (나중에 조정 가능)
                        .anyRequest().authenticated()
                )
                // 테스트용 basic auth (나중에 JWT로 교체 가능)
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    // ✅ CORS 설정
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 프론트 주소 허용
        config.setAllowedOrigins(List.of("http://localhost:3000"));

        // 허용할 HTTP 메서드
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // 허용할 헤더
        config.setAllowedHeaders(List.of("*"));

        // 클라이언트에서 쿠키/인증정보 보내는 것 허용할지
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 모든 경로에 대해 위 CORS 설정 적용
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ✅ 비밀번호 암호화용 Bean
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
