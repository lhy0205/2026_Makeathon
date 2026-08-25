package com.medilink.visualization.dto;

import java.util.List;

public record HealthTrendResponse(
        List<HealthTrendPoint> data
) {
}
