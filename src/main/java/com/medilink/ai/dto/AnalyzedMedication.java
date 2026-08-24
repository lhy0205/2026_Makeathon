package com.medilink.ai.dto;

import java.math.BigDecimal;

public record AnalyzedMedication(
        String medicationName,
        BigDecimal dosage,
        String doseUnit,
        Integer frequencyPerDay,
        Integer durationDays,
        String instructions,
        String purpose,
        String sideEffectSummary,
        Double confidence,
        boolean unmatched
) {
}
