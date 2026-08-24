package com.medilink.healthlog.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record HealthLogRequest(
        @NotNull LocalDateTime recordedAt,
        String symptomName,
        Integer symptomSeverity,
        @NotNull
        List<String> sideEffects,
        BigDecimal bodyTemperature,
        BigDecimal sleepHours,
        Integer waterIntakeMl,
        Integer activityMinutes,
        String memo
) {
}
