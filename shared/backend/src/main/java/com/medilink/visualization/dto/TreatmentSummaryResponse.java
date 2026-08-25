package com.medilink.visualization.dto;

import java.math.BigDecimal;
import java.util.List;

public record TreatmentSummaryResponse(
        Integer initialSymptomSeverity,
        Integer finalSymptomSeverity,
        BigDecimal initialBodyTemperature,
        BigDecimal finalBodyTemperature,
        List<String> majorSideEffects,
        double adherenceRate
) {
}
