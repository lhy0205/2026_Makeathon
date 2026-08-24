package com.medilink.visualization.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LifestyleTrendPoint(
        LocalDateTime recordedAt,
        BigDecimal sleepHours,
        Integer waterIntakeMl,
        Integer activityMinutes
) {
}
