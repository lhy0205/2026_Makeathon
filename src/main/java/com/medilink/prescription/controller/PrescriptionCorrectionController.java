package com.medilink.prescription.controller;

import com.medilink.prescription.dto.PrescriptionCorrectionRequest;
import com.medilink.prescription.dto.PrescriptionCorrectionResponse;
import com.medilink.prescription.service.PrescriptionCorrectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PrescriptionCorrectionController {

    private final PrescriptionCorrectionService correctionService;

    @PostMapping("/api/v1/prescriptions/{prescriptionId}/corrections")
    @ResponseStatus(HttpStatus.CREATED)
    public PrescriptionCorrectionResponse create(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long prescriptionId,
            @Valid @RequestBody PrescriptionCorrectionRequest request
    ) {
        return correctionService.create(userId, prescriptionId, request);
    }

    @GetMapping("/internal/v1/corrections")
    public List<PrescriptionCorrectionResponse> getAllForAi() {
        return correctionService.getAllForAi();
    }
}
