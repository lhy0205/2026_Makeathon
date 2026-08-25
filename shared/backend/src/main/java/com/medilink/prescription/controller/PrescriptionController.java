package com.medilink.prescription.controller;

import com.medilink.ai.dto.PrescriptionAnalysisResult;
import com.medilink.prescription.dto.ConfirmPrescriptionRequest;
import com.medilink.prescription.dto.PrescriptionResponse;
import com.medilink.prescription.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/visits/{visitId}")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping("/prescriptions/scan")
    public PrescriptionAnalysisResult scanPrescription(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @RequestPart("image") MultipartFile image
    ) {
        return prescriptionService.scanPrescription(userId, visitId, image);
    }

    @PostMapping("/prescriptions")
    @ResponseStatus(HttpStatus.CREATED)
    public PrescriptionResponse confirmPrescription(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @Valid @RequestBody ConfirmPrescriptionRequest request
    ) {
        return prescriptionService.confirmPrescription(userId, visitId, request);
    }

    @GetMapping("/prescription")
    public PrescriptionResponse getPrescription(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return prescriptionService.getPrescription(userId, visitId);
    }
}
