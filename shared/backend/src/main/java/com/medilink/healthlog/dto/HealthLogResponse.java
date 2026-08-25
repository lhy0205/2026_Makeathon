package com.medilink.healthlog.dto;

import com.medilink.healthlog.entity.HealthLog;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public record HealthLogResponse(
        Long id,
        Long visitId,
        LocalDateTime recordedAt,
        String symptomName,
        Integer symptomSeverity,
        List<String> sideEffects,
        BigDecimal bodyTemperature,
        BigDecimal sleepHours,
        Integer waterIntakeMl,
        Integer activityMinutes,
        String memo,
        LocalDateTime createdAt
) {
    public static HealthLogResponse from(HealthLog log) {
        return new HealthLogResponse(
                log.getId(),
                log.getVisit().getId(),
                log.getRecordedAt(),
                log.getSymptomName(),
                log.getSymptomSeverity(),
                parseSideEffects(log.getSideEffects()),
                log.getBodyTemperature(),
                log.getSleepHours(),
                log.getWaterIntakeMl(),
                log.getActivityMinutes(),
                log.getMemo(),
                log.getCreatedAt()
        );
    }

    private static List<String> parseSideEffects(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        List<String> sideEffects = new ArrayList<>();
        String[] values = value.split("\\n");

        for (String item : values) {
            if (!item.isBlank()) {
                sideEffects.add(item.trim());
            }
        }

        return sideEffects;
    }
}
