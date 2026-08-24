package com.medilink.visit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record VisitRequest(
        @NotBlank(message = "병원명을 입력해 주세요.")
        String hospitalName,

        String departmentName,

        @NotNull(message = "방문일을 입력해 주세요.")
        LocalDate visitedAt,

        String visitReason,
        LocalDate medicationStartDate,
        LocalDate medicationEndDate
) {
}
