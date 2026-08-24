package com.medilink.visit.dto;

import com.medilink.visit.entity.TreatmentStatus;
import com.medilink.visit.entity.Visit;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record VisitResponse(
        Long id,
        String hospitalName,
        String departmentName,
        LocalDate visitedAt,
        String visitReason,
        TreatmentStatus treatmentStatus,
        LocalDate medicationStartDate,
        LocalDate medicationEndDate,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static VisitResponse from(Visit visit) {
        return new VisitResponse(
                visit.getId(),
                visit.getHospitalName(),
                visit.getDepartmentName(),
                visit.getVisitedAt(),
                visit.getVisitReason(),
                visit.getTreatmentStatus(),
                visit.getMedicationStartDate(),
                visit.getMedicationEndDate(),
                visit.getCreatedAt(),
                visit.getUpdatedAt()
        );
    }
}
