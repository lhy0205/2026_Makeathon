package com.medilink.comparison.dto;

import com.medilink.comparison.entity.TreatmentComparison;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public record ComparisonResponse(
        Long currentVisitId,
        Long pastVisitId,
        List<String> commonPoints,
        List<String> differences,
        String summary,
        LocalDateTime createdAt
) {
    public static ComparisonResponse from(TreatmentComparison comparison) {
        return new ComparisonResponse(
                comparison.getCurrentVisit().getId(),
                comparison.getPastVisit().getId(),
                parseValues(comparison.getCommonPoints()),
                parseValues(comparison.getDifferences()),
                comparison.getSummary(),
                comparison.getCreatedAt()
        );
    }

    private static List<String> parseValues(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        List<String> values = new ArrayList<>();
        String[] items = value.split("\\n");

        for (String item : items) {
            if (!item.isBlank()) {
                values.add(item.trim());
            }
        }

        return values;
    }
}
