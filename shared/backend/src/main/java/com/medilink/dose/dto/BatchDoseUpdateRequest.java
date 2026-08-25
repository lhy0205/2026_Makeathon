package com.medilink.dose.dto;

import com.medilink.dose.entity.DoseStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record BatchDoseUpdateRequest(
        @NotNull(message = "복약 일정 ID를 입력해 주세요.")
        Long doseId,

        @NotNull(message = "복약 상태를 입력해 주세요.")
        DoseStatus status,

        LocalDateTime takenAt
) {
}
