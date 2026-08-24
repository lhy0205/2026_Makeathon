package com.medilink.visualization.dto;

import java.util.List;

public record TreatmentChartData(
        Long visitId,
        List<SymptomTrendPoint> symptomTrend,
        double adherenceRate,
        Integer finalSymptomSeverity
) {
}
