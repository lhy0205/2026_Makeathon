package com.medilink.visualization.controller;

import com.medilink.visualization.dto.HealthTrendPoint;
import com.medilink.visualization.dto.LifestyleTrendPoint;
import com.medilink.visualization.dto.TreatmentComparisonChartResponse;
import com.medilink.visualization.dto.TreatmentSummaryResponse;
import com.medilink.visualization.service.VisualizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/visits/{visitId}/visualizations")
public class VisualizationController {

    private final VisualizationService visualizationService;

    @GetMapping("/health-trend")
    public List<HealthTrendPoint> getHealthTrend(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return visualizationService.getHealthTrend(userId, visitId);
    }

    @GetMapping("/lifestyle-trend")
    public List<LifestyleTrendPoint> getLifestyleTrend(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return visualizationService.getLifestyleTrend(userId, visitId);
    }

    @GetMapping("/summary")
    public TreatmentSummaryResponse getTreatmentSummary(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return visualizationService.getTreatmentSummary(userId, visitId);
    }

    @GetMapping("/comparison")
    public TreatmentComparisonChartResponse getTreatmentComparisonChart(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return visualizationService.getTreatmentComparisonChart(userId, visitId);
    }
}
