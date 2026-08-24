package com.medilink.report.controller;

import com.medilink.report.dto.ReportResponse;
import com.medilink.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class ReportController {

    private final ReportService reportService;

    @PostMapping("/visits/{visitId}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResponse generateReport(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return reportService.generateReport(userId, visitId);
    }

    @GetMapping("/visits/{visitId}/reports")
    public List<ReportResponse> getReports(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return reportService.getReports(userId, visitId);
    }

    @GetMapping("/visits/{visitId}/reports/latest")
    public ReportResponse getLatestReport(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return reportService.getLatestReport(userId, visitId);
    }

    @GetMapping("/reports/{reportId}")
    public ReportResponse getReport(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long reportId
    ) {
        return reportService.getReport(userId, reportId);
    }

    @DeleteMapping("/reports/{reportId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReport(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long reportId
    ) {
        reportService.deleteReport(userId, reportId);
    }
}
