package com.medilink.admin.dto;

public record AdminDashboardResponse(
        long userCount,
        long prescriptionCount,
        double averageAdherenceRate,
        double ocrUnmatchedRate
) {
}
