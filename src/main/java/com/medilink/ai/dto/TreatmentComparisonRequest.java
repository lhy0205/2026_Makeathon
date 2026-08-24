package com.medilink.ai.dto;

import java.util.List;

public record TreatmentComparisonRequest(TreatmentSnapshot current, TreatmentSnapshot past) {

    public record TreatmentSnapshot(
            Long visitId,
            String hospitalName,
            List<String> medicationNames,
            Integer initialSeverity,
            Integer finalSeverity,
            String finalStatus
    ) {
    }
}
