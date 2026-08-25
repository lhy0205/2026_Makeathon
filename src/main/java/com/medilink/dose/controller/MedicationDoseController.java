package com.medilink.dose.controller;

import com.medilink.dose.dto.CreateDosesRequest;
import com.medilink.dose.dto.BatchDoseUpdateRequest;
import com.medilink.dose.dto.MarkDoseTakenRequest;
import com.medilink.dose.dto.MedicationDoseResponse;
import com.medilink.dose.service.MedicationDoseService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDate;
import java.util.List;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class MedicationDoseController {

    private final MedicationDoseService medicationDoseService;

    @PostMapping("/medications/{medicationId}/doses")
    @ResponseStatus(HttpStatus.CREATED)
    public List<MedicationDoseResponse> createMedicationDoses(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long medicationId,
            @Valid @RequestBody CreateDosesRequest request
    ) {
        return medicationDoseService.createMedicationDoses(userId, medicationId, request);
    }

    @GetMapping("/visits/{visitId}/doses")
    public List<MedicationDoseResponse> getVisitDoses(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return medicationDoseService.getVisitDoses(userId, visitId);
    }

    @GetMapping("/doses/today")
    public List<MedicationDoseResponse> getTodayDoses(@AuthenticationPrincipal Long userId) {
        return medicationDoseService.getTodayDoses(userId);
    }

    @GetMapping("/doses")
    public List<MedicationDoseResponse> getDosesByDate(
            @AuthenticationPrincipal Long userId,
            @RequestParam LocalDate date
    ) {
        return medicationDoseService.getDosesByDate(userId, date);
    }

    @PutMapping("/doses/{doseId}/taken")
    public MedicationDoseResponse markDoseAsTaken(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long doseId,
            @Valid @RequestBody MarkDoseTakenRequest request
    ) {
        return medicationDoseService.markDoseAsTaken(userId, doseId, request);
    }

    @PutMapping("/doses/{doseId}/skipped")
    public MedicationDoseResponse markDoseAsSkipped(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long doseId
    ) {
        return medicationDoseService.markDoseAsSkipped(userId, doseId);
    }

    @PutMapping("/doses/batch")
    public List<MedicationDoseResponse> updateDosesBatch(
            @AuthenticationPrincipal Long userId,
            @RequestBody
            @NotEmpty(message = "변경할 복약 일정을 한 개 이상 입력해 주세요.")
            List<@Valid BatchDoseUpdateRequest> requests
    ) {
        return medicationDoseService.updateDosesBatch(userId, requests);
    }
}
