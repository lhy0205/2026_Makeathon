package com.medilink.ai.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ReportGenerationRequest(
        Long visitId,
        VisitSummary visit,
        List<MedicationSummary> medications,
        List<HealthLogSummary> healthLogs
) {

    public record VisitSummary(
            String hospitalName,
            String departmentName,
            String visitReason,
            LocalDate medicationStartDate,
            LocalDate medicationEndDate
    ) {
    }

    public record MedicationSummary(String name, String dosage, String purpose) {
    }

    public record HealthLogSummary(
            LocalDateTime recordedAt,
            String symptomName,
            Integer symptomSeverity,
            String sideEffects,
            BigDecimal bodyTemperature,
            BigDecimal sleepHours
    ) {
    }
}
