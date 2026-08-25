package com.medilink.prescription.controller;

import com.medilink.prescription.service.PrescriptionService;
import com.medilink.prescription.storage.StoredPrescriptionImage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/prescriptions")
public class PrescriptionImageController {

    private final PrescriptionService prescriptionService;

    @GetMapping("/{prescriptionId}/image")
    public ResponseEntity<?> getPrescriptionImage(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long prescriptionId
    ) {
        StoredPrescriptionImage image = prescriptionService.getPrescriptionImage(userId, prescriptionId);

        return ResponseEntity.ok()
                .contentType(image.mediaType())
                .body(image.resource());
    }
}
