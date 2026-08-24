package com.medilink.push.dto;

import jakarta.validation.constraints.NotBlank;

public record RegisterPushTokenRequest(
        @NotBlank(message = "알림 토큰을 입력해 주세요.")
        String token
) {
}
