package com.medilink.prescription.dto;

import com.medilink.prescription.entity.AnalysisStatus;
import com.medilink.prescription.entity.Prescription;

import java.time.LocalDateTime;
import java.util.List;

public record PrescriptionResponse(
        Long id,
        Long visitId,
        String imageUrl,
        String rawOcrText,
        AnalysisStatus analysisStatus,
        LocalDateTime analyzedAt,
        List<MedicationResponse> medications
) {

    public static PrescriptionResponse from(
            Prescription prescription,
            List<MedicationResponse> medications
    ) {
        return new PrescriptionResponse(
                prescription.getId(),
                prescription.getVisit().getId(),
                prescription.getImageUrl(),
                prescription.getRawOcrText(),
                prescription.getAnalysisStatus(),
                prescription.getAnalyzedAt(),
                medications
        );
    }
}
