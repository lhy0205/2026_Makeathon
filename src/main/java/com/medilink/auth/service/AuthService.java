package com.medilink.auth.service;

import com.medilink.auth.dto.AuthResponse;
import com.medilink.auth.dto.LoginRequest;
import com.medilink.auth.dto.RegisterRequest;
import com.medilink.global.exception.ApiException;
import com.medilink.global.security.JwtService;
import com.medilink.user.dto.UserResponse;
import com.medilink.user.entity.User;
import com.medilink.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user = new User(request.email(), passwordHash, request.nickname());
        User savedUser = userRepository.save(user);
        String accessToken = jwtService.createToken(savedUser.getId());

        return new AuthResponse(accessToken, UserResponse.from(savedUser));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        String accessToken = jwtService.createToken(user.getId());

        return new AuthResponse(accessToken, UserResponse.from(user));
    }
}
