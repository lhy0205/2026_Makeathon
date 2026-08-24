package com.medilink.comparison.dto;

import com.medilink.visit.entity.Visit;

import java.time.LocalDate;

public record VisitHistoryItem(
        Long visitId,
        String hospitalName,
        String departmentName,
        LocalDate visitedAt,
        String treatmentStatus
) {
    public static VisitHistoryItem from(Visit visit) {
        return new VisitHistoryItem(
                visit.getId(),
                visit.getHospitalName(),
                visit.getDepartmentName(),
                visit.getVisitedAt(),
                visit.getTreatmentStatus().name()
        );
    }
}
