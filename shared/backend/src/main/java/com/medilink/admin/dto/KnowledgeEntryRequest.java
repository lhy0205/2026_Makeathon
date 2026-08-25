package com.medilink.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record KnowledgeEntryRequest(
        @NotBlank(message = "품목기준코드를 입력해 주세요.")
        @Size(max = 20, message = "품목기준코드는 20자 이하로 입력해 주세요.")
        String itemSeq,

        @NotBlank(message = "약 이름을 입력해 주세요.")
        String medicationName,

        String purpose,
        String sideEffects,
        /** 음주·식전식후 등 생활습관 안내 */
        String precautions
) {
}
