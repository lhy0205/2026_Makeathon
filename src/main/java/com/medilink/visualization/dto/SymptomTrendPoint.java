package com.medilink.visualization.dto;

import java.time.LocalDate;

public record SymptomTrendPoint(
        LocalDate date,
        Integer symptomSeverity
) {
}
