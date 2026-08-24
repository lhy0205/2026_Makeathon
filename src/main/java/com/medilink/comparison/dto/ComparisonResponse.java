package com.medilink.comparison.dto;

public record ComparisonResponse(
        Long currentVisitId,
        Long pastVisitId,
        String commonPoints,
        String differences,
        String summary
) {
}
