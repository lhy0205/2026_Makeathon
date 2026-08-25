package com.medilink.prescription.dto;

import com.medilink.prescription.entity.PrescriptionCorrection;

import java.time.LocalDateTime;

public record PrescriptionCorrectionResponse(
        Long id,
        Long prescriptionId,
        String ocrText,
        String correctedName,
        String itemSeq,
        LocalDateTime createdAt
) {

    public static PrescriptionCorrectionResponse from(PrescriptionCorrection correction) {
        return new PrescriptionCorrectionResponse(
                correction.getId(),
                correction.getPrescription().getId(),
                correction.getOcrText(),
                correction.getCorrectedName(),
                correction.getItemSeq(),
                correction.getCreatedAt()
        );
    }
}
