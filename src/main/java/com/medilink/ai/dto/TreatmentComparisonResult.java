package com.medilink.ai.dto;

import java.util.List;

public record TreatmentComparisonResult(
        List<String> commonPoints,
        List<String> differences,
        String summary
) {
}
