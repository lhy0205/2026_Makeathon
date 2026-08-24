package com.medilink.ai.dto;

import java.util.List;

public record PrescriptionAnalysisResult(
        String rawOcrText,
        String hospitalName,
        String departmentName,
        List<AnalyzedMedication> medications
) {
}
