package com.medilink.visit.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CompleteVisitRequest(
        @NotNull(message = "복약 종료일을 입력해 주세요.")
        LocalDate completedAt
) {
}
