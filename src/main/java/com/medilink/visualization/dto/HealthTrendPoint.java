package com.medilink.visualization.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record HealthTrendPoint(
        LocalDate date,
        Integer symptomSeverity,
        BigDecimal bodyTemperature
) {
}
