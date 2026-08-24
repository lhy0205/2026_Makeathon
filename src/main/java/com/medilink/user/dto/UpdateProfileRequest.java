package com.medilink.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "닉네임을 입력해 주세요.")
        @Size(max = 100, message = "닉네임은 100자 이하로 입력해 주세요.")
        String nickname
) {
}
