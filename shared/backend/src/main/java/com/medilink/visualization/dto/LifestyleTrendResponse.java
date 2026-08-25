package com.medilink.visualization.dto;

import java.util.List;

public record LifestyleTrendResponse(
        List<LifestyleTrendPoint> data
) {
}
