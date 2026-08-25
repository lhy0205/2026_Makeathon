package com.medilink.auth.service;

import com.medilink.auth.entity.RefreshToken;
import com.medilink.auth.repository.RefreshTokenRepository;
import com.medilink.global.exception.ApiException;
import com.medilink.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh-expiration-days:30}")
    private long refreshExpirationDays;

    public IssuedRefreshToken issue(User user) {
        byte[] randomBytes = new byte[48];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        LocalDateTime expiresAt = LocalDateTime.now().plusDays(refreshExpirationDays);
        RefreshToken refreshToken = new RefreshToken(user, hash(rawToken), expiresAt);
        refreshTokenRepository.save(refreshToken);

        return new IssuedRefreshToken(rawToken, user);
    }

    public IssuedRefreshToken rotate(String rawToken) {
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "유효하지 않은 refresh token입니다."));
        LocalDateTime now = LocalDateTime.now();

        if (!refreshToken.isUsable(now)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "만료되었거나 사용된 refresh token입니다.");
        }

        refreshToken.revoke(now);
        return issue(refreshToken.getUser());
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 해시를 사용할 수 없습니다.", exception);
        }
    }

    public record IssuedRefreshToken(String rawToken, User user) {
    }
}
