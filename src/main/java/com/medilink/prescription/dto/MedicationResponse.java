package com.medilink.prescription.dto;

import com.medilink.medication.entity.Medication;

import java.math.BigDecimal;

public record MedicationResponse(
        Long id,
        String medicationName,
        String itemSeq,
        BigDecimal dosage,
        String doseUnit,
        Integer frequencyPerDay,
        Integer durationDays,
        String instructions,
        String purpose,
        String sideEffectSummary,
        Double confidence,
        boolean unmatched
) {

    public static MedicationResponse from(Medication medication) {
        return new MedicationResponse(
                medication.getId(),
                medication.getMedicationName(),
                medication.getItemSeq(),
                medication.getDosage(),
                medication.getDoseUnit(),
                medication.getFrequencyPerDay(),
                medication.getDurationDays(),
                medication.getInstructions(),
                medication.getPurpose(),
                medication.getSideEffectSummary(),
                medication.getOcrConfidence(),
                medication.isOcrUnmatched()
        );
    }
}
