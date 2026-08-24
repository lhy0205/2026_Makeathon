package com.medilink.visualization.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record HealthTrendPoint(
        LocalDateTime recordedAt,
        String symptomName,
        Integer symptomSeverity,
        BigDecimal bodyTemperature
) {
}
