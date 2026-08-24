package com.medilink.visualization.dto;

public record TreatmentComparisonChartResponse(
        TreatmentChartData currentTreatment,
        TreatmentChartData pastTreatment
) {
}
