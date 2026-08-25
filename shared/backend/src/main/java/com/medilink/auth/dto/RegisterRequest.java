package com.medilink.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Email(message = "이메일 형식을 확인해 주세요.")
        @NotBlank(message = "이메일을 입력해 주세요.")
        String email,

        @NotBlank(message = "비밀번호를 입력해 주세요.")
        @Size(min = 8, max = 100, message = "비밀번호는 8자 이상 100자 이하로 입력해 주세요.")
        String password,

        @NotBlank(message = "닉네임을 입력해 주세요.")
        @Size(max = 100, message = "닉네임은 100자 이하로 입력해 주세요.")
        String nickname
) {
}
