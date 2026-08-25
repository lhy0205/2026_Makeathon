package com.medilink.visit.controller;

import com.medilink.visit.dto.CompleteVisitRequest;
import com.medilink.visit.dto.VisitRequest;
import com.medilink.visit.dto.VisitResponse;
import com.medilink.visit.service.VisitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/visits")
public class VisitController {

    private final VisitService visitService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VisitResponse createVisit(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody VisitRequest request
    ) {
        return visitService.createVisit(userId, request);
    }

    @GetMapping
    public List<VisitResponse> getVisits(@AuthenticationPrincipal Long userId) {
        return visitService.getVisits(userId);
    }

    @GetMapping("/{visitId}")
    public VisitResponse getVisit(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return visitService.getVisit(userId, visitId);
    }

    @GetMapping("/calendar")
    public List<VisitResponse> getMonthlyVisits(
            @AuthenticationPrincipal Long userId,
            @RequestParam int year,
            @RequestParam int month
    ) {
        return visitService.getMonthlyVisits(userId, year, month);
    }

    @PutMapping("/{visitId}")
    public VisitResponse updateVisit(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @Valid @RequestBody VisitRequest request
    ) {
        return visitService.updateVisit(userId, visitId, request);
    }

    @DeleteMapping("/{visitId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVisit(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        visitService.deleteVisit(userId, visitId);
    }

    @PutMapping("/{visitId}/complete")
    public VisitResponse completeVisit(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @Valid @RequestBody CompleteVisitRequest request
    ) {
        return visitService.completeVisit(userId, visitId, request);
    }
}
