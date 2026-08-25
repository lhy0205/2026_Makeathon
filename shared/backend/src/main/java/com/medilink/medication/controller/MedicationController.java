package com.medilink.medication.controller;

import com.medilink.medication.service.MedicationService;
import com.medilink.prescription.dto.MedicationRequest;
import com.medilink.prescription.dto.MedicationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/medications")
public class MedicationController {

    private final MedicationService medicationService;

    @PutMapping("/{medicationId}")
    public MedicationResponse updateMedication(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long medicationId,
            @Valid @RequestBody MedicationRequest request
    ) {
        return medicationService.updateMedication(userId, medicationId, request);
    }

    @DeleteMapping("/{medicationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMedication(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long medicationId
    ) {
        medicationService.deleteMedication(userId, medicationId);
    }
}
