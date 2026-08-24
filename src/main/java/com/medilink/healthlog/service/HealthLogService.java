package com.medilink.healthlog.service;

import com.medilink.global.exception.ApiException;
import com.medilink.healthlog.dto.HealthLogRequest;
import com.medilink.healthlog.dto.HealthLogResponse;
import com.medilink.healthlog.entity.HealthLog;
import com.medilink.healthlog.repository.HealthLogRepository;
import com.medilink.visit.entity.Visit;
import com.medilink.visit.service.VisitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HealthLogService {

    private final HealthLogRepository healthLogRepository;
    private final VisitService visitService;

    @Transactional
    public HealthLogResponse createHealthLog(Long userId, Long visitId, HealthLogRequest request) {
        Visit visit = visitService.getOwnedVisit(userId, visitId);

        LocalDate day = request.recordedAt().toLocalDate();
        boolean alreadyLogged = healthLogRepository.existsByVisitIdAndRecordedAtBetween(
                visitId, day.atStartOfDay(), day.plusDays(1).atStartOfDay().minusNanos(1)
        );
        if (alreadyLogged) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 해당 날짜의 건강 기록이 존재합니다.");
        }

        HealthLog log = new HealthLog(
                visit,
                request.recordedAt(),
                request.symptomName(),
                request.symptomSeverity(),
                request.sideEffects(),
                request.bodyTemperature(),
                request.sleepHours(),
                request.waterIntakeMl(),
                request.activityMinutes(),
                request.memo()
        );
        return HealthLogResponse.from(healthLogRepository.save(log));
    }

    @Transactional(readOnly = true)
    public List<HealthLogResponse> getHealthLogs(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        return healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(visitId)
                .stream()
                .map(HealthLogResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public HealthLogResponse getHealthLog(Long userId, Long healthLogId) {
        return HealthLogResponse.from(getOwnedHealthLog(userId, healthLogId));
    }

    @Transactional
    public HealthLogResponse updateHealthLog(Long userId, Long healthLogId, HealthLogRequest request) {
        HealthLog log = getOwnedHealthLog(userId, healthLogId);
        log.update(
                request.symptomName(),
                request.symptomSeverity(),
                request.sideEffects(),
                request.bodyTemperature(),
                request.sleepHours(),
                request.waterIntakeMl(),
                request.activityMinutes(),
                request.memo()
        );
        return HealthLogResponse.from(log);
    }

    @Transactional
    public void deleteHealthLog(Long userId, Long healthLogId) {
        healthLogRepository.delete(getOwnedHealthLog(userId, healthLogId));
    }

    private HealthLog getOwnedHealthLog(Long userId, Long healthLogId) {
        return healthLogRepository.findByIdAndVisitUserId(healthLogId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "건강 기록을 찾을 수 없습니다."));
    }
}
