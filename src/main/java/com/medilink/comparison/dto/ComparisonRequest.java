package com.medilink.comparison.dto;

import jakarta.validation.constraints.NotNull;

public record ComparisonRequest(
        @NotNull Long pastVisitId
) {
}
