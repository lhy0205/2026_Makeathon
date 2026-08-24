package com.medilink.ai.dto;

import java.util.List;

public record ChatAskRequest(Long visitId, String question, List<MedicationSummary> medications) {

    public record MedicationSummary(String name, String dosage, String instructions) {
    }
}
