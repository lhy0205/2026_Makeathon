package com.medilink.visualization.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LifestyleTrendPoint(
        LocalDate date,
        BigDecimal sleepHours,
        Integer waterIntakeMl,
        Integer activityMinutes
) {
}
