package com.medilink.comparison.controller;

import com.medilink.comparison.dto.ComparisonResponse;
import com.medilink.comparison.dto.VisitHistoryItem;
import com.medilink.comparison.service.ComparisonService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    public List<VisitHistoryItem> getVisitsByCategory(
            @AuthenticationPrincipal Long userId,
            @RequestParam String category
    ) {
        return comparisonService.getVisitsByCategory(userId, category);
    }

    @PostMapping("/{visitId}/comparisons")
    public ComparisonResponse compareTreatmentHistory(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return comparisonService.compareTreatmentHistory(userId, visitId);
    }
}
