package com.medilink.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
        @NotBlank(message = "refresh token을 입력해 주세요.")
        String refreshToken
) {
}
