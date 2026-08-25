package com.medilink.report.dto;

import com.medilink.report.entity.Report;

import java.time.LocalDateTime;

public record ReportResponse(
        Long id,
        Long visitId,
        String summary,
        String symptomChanges,
        String suspectedSideEffects,
        String lifestyleSummary,
        double adherenceRate,
        String doctorNotes,
        LocalDateTime generatedAt
) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(
                report.getId(),
                report.getVisit().getId(),
                report.getSummary(),
                report.getSymptomChanges(),
                report.getSuspectedSideEffects(),
                report.getLifestyleSummary(),
                report.getAdherenceRate(),
                report.getDoctorNotes(),
                report.getGeneratedAt()
        );
    }
}
