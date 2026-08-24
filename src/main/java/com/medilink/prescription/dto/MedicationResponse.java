package com.medilink.prescription.dto;

import com.medilink.medication.entity.Medication;

import java.math.BigDecimal;

public record MedicationResponse(
        Long id,
        String medicationName,
        BigDecimal dosage,
        String doseUnit,
        Integer frequencyPerDay,
        Integer durationDays,
        String instructions,
        String purpose,
        String sideEffectSummary
) {

    public static MedicationResponse from(Medication medication) {
        return new MedicationResponse(
                medication.getId(),
                medication.getMedicationName(),
                medication.getDosage(),
                medication.getDoseUnit(),
                medication.getFrequencyPerDay(),
                medication.getDurationDays(),
                medication.getInstructions(),
                medication.getPurpose(),
                medication.getSideEffectSummary()
        );
    }
}
