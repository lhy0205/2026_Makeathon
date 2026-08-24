package com.medilink.visualization.dto;

public record TreatmentComparisonChartResponse(
        Long currentVisitId,
        Long pastVisitId,
        Integer currentInitialSeverity,
        Integer currentFinalSeverity,
        Integer pastInitialSeverity,
        Integer pastFinalSeverity,
        double currentAdherenceRate,
        double pastAdherenceRate,
        String currentFinalStatus,
        String pastFinalStatus
) {
}
