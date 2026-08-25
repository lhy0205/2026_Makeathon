package com.medilink.prescription.dto;

import jakarta.validation.constraints.NotBlank;

public record PrescriptionCorrectionRequest(
        @NotBlank(message = "OCR로 인식된 약 이름을 입력해 주세요.")
        String ocrText,

        @NotBlank(message = "교정한 약 이름을 입력해 주세요.")
        String correctedName,

        String itemSeq
) {
}
