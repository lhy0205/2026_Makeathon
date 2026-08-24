package com.medilink.dose.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record MarkDoseTakenRequest(
        @NotNull(message = "실제 복용 시간을 입력해 주세요.")
        LocalDateTime takenAt
) {
}
