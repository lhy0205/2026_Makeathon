package com.medilink.visualization.dto;

import java.math.BigDecimal;

public record TreatmentSummaryResponse(
        Integer initialSeverity,
        Integer finalSeverity,
        BigDecimal initialTemperature,
        BigDecimal finalTemperature,
        long sideEffectCount,
        long totalDoses,
        long takenDoses,
        double adherenceRate
) {
}
