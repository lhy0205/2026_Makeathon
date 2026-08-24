package com.medilink.dose.dto;

import com.medilink.dose.entity.DoseStatus;
import com.medilink.dose.entity.MedicationDose;

import java.time.LocalDateTime;

public record MedicationDoseResponse(
        Long id,
        Long medicationId,
        String medicationName,
        LocalDateTime scheduledAt,
        DoseStatus doseStatus,
        LocalDateTime takenAt
) {

    public static MedicationDoseResponse from(MedicationDose dose) {
        return new MedicationDoseResponse(
                dose.getId(),
                dose.getMedication().getId(),
                dose.getMedication().getMedicationName(),
                dose.getScheduledAt(),
                dose.getDoseStatus(),
                dose.getTakenAt()
        );
    }
}
