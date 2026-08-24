package com.medilink.chat.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatQuestionRequest(@NotBlank String question) {
}
