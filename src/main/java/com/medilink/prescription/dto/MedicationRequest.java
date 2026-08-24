package com.medilink.prescription.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record MedicationRequest(
        @NotBlank(message = "약 이름을 입력해 주세요.")
        String medicationName,
        BigDecimal dosage,
        String doseUnit,
        Integer frequencyPerDay,
        Integer durationDays,
        String instructions,
        String purpose,
        String sideEffectSummary
) {
}
