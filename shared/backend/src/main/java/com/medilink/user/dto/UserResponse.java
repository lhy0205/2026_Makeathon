package com.medilink.user.dto;

import com.medilink.user.entity.User;
import com.medilink.user.entity.UserRole;

public record UserResponse(
        Long id,
        String email,
        String nickname,
        UserRole role
) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole()
        );
    }
}
