package com.medilink.dose.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record CreateDosesRequest(
        @NotNull(message = "복약 시작일을 입력해 주세요.")
        LocalDate startDate,

        @NotNull(message = "복약 종료일을 입력해 주세요.")
        LocalDate endDate,

        @NotEmpty(message = "복약 시간을 한 개 이상 입력해 주세요.")
        List<LocalTime> times
) {
}
