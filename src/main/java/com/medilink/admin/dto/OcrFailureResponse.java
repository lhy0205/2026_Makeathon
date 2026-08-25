package com.medilink.admin.dto;

import com.medilink.medication.entity.Medication;

public record OcrFailureResponse(
        Long medicationId,
        Long prescriptionId,
        String medicationName,
        String itemSeq,
        Double confidence
) {

    public static OcrFailureResponse from(Medication medication) {
        return new OcrFailureResponse(
                medication.getId(),
                medication.getPrescription().getId(),
                medication.getMedicationName(),
                medication.getItemSeq(),
                medication.getOcrConfidence()
        );
    }
}
