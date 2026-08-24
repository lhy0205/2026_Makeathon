package com.medilink.auth.dto;

import com.medilink.user.dto.UserResponse;

public record AuthResponse(
        String accessToken,
        UserResponse user
) {
}
