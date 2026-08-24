package com.medilink.healthlog.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record HealthLogRequest(
        @NotNull LocalDateTime recordedAt,
        String symptomName,
        Integer symptomSeverity,
        String sideEffects,
        BigDecimal bodyTemperature,
        BigDecimal sleepHours,
        Integer waterIntakeMl,
        Integer activityMinutes,
        String memo
) {
}
