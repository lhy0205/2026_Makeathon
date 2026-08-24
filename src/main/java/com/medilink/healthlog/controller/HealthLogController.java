package com.medilink.healthlog.controller;

import com.medilink.healthlog.dto.HealthLogRequest;
import com.medilink.healthlog.dto.HealthLogResponse;
import com.medilink.healthlog.service.HealthLogService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class HealthLogController {

    private final HealthLogService healthLogService;

    @PostMapping("/visits/{visitId}/health-logs")
    @ResponseStatus(HttpStatus.CREATED)
    public HealthLogResponse createHealthLog(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @Valid @RequestBody HealthLogRequest request
    ) {
        return healthLogService.createHealthLog(userId, visitId, request);
    }

    @GetMapping("/visits/{visitId}/health-logs")
    public List<HealthLogResponse> getHealthLogs(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return healthLogService.getHealthLogs(userId, visitId);
    }

    @GetMapping("/health-logs/{healthLogId}")
    public HealthLogResponse getHealthLog(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long healthLogId
    ) {
        return healthLogService.getHealthLog(userId, healthLogId);
    }

    @PutMapping("/health-logs/{healthLogId}")
    public HealthLogResponse updateHealthLog(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long healthLogId,
            @Valid @RequestBody HealthLogRequest request
    ) {
        return healthLogService.updateHealthLog(userId, healthLogId, request);
    }

    @DeleteMapping("/health-logs/{healthLogId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteHealthLog(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long healthLogId
    ) {
        healthLogService.deleteHealthLog(userId, healthLogId);
    }
}
