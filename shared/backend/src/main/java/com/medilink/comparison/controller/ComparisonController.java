package com.medilink.comparison.controller;

import com.medilink.comparison.dto.ComparisonRequest;
import com.medilink.comparison.dto.ComparisonResponse;
import com.medilink.comparison.service.ComparisonService;
import com.medilink.visit.dto.VisitResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/visits")
public class ComparisonController {

    private final ComparisonService comparisonService;

    @GetMapping("/history")
    public List<VisitResponse> getVisitsByCategory(
            @AuthenticationPrincipal Long userId,
            @RequestParam("symptomCategory") String symptomCategory
    ) {
        return comparisonService.getVisitsByCategory(userId, symptomCategory);
    }

    @PostMapping("/{visitId}/comparisons")
    public ComparisonResponse compareTreatmentHistory(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @Valid @RequestBody ComparisonRequest request
    ) {
        return comparisonService.compareTreatmentHistory(userId, visitId, request);
    }

    @GetMapping("/{visitId}/comparisons/latest")
    public ComparisonResponse getLatestComparison(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return comparisonService.getLatestComparison(userId, visitId);
    }
}
