package com.medilink.ai.dto;

public record GeneratedReport(
        String summary,
        String symptomChanges,
        String suspectedSideEffects,
        String lifestyleSummary,
        double adherenceRate,
        String doctorNotes
) {
}
