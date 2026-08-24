package com.medilink.healthlog.dto;

import com.medilink.healthlog.entity.HealthLog;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record HealthLogResponse(
        Long id,
        Long visitId,
        LocalDateTime recordedAt,
        String symptomName,
        Integer symptomSeverity,
        String sideEffects,
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
                log.getSideEffects(),
                log.getBodyTemperature(),
                log.getSleepHours(),
                log.getWaterIntakeMl(),
                log.getActivityMinutes(),
                log.getMemo(),
                log.getCreatedAt()
        );
    }
}
