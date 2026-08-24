package com.medilink.prescription.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ConfirmPrescriptionRequest(
        String imageUrl,
        String rawOcrText,

        @Valid
        @NotEmpty(message = "처방 약을 한 개 이상 입력해 주세요.")
        List<MedicationRequest> medications
) {
}
