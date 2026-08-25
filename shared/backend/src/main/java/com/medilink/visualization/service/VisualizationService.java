package com.medilink.visualization.service;

import com.medilink.dose.entity.DoseStatus;
import com.medilink.dose.entity.MedicationDose;
import com.medilink.dose.repository.MedicationDoseRepository;
import com.medilink.global.exception.ApiException;
import com.medilink.healthlog.entity.HealthLog;
import com.medilink.healthlog.repository.HealthLogRepository;
import com.medilink.visit.entity.Visit;
import com.medilink.visit.repository.VisitRepository;
import com.medilink.visit.service.VisitService;
import com.medilink.visualization.dto.HealthTrendPoint;
import com.medilink.visualization.dto.HealthTrendResponse;
import com.medilink.visualization.dto.LifestyleTrendPoint;
import com.medilink.visualization.dto.LifestyleTrendResponse;
import com.medilink.visualization.dto.SymptomTrendPoint;
import com.medilink.visualization.dto.TreatmentChartData;
import com.medilink.visualization.dto.TreatmentComparisonChartResponse;
import com.medilink.visualization.dto.TreatmentSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VisualizationService {

    private final HealthLogRepository healthLogRepository;
    private final MedicationDoseRepository medicationDoseRepository;
    private final VisitRepository visitRepository;
    private final VisitService visitService;

    public HealthTrendResponse getHealthTrend(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        List<HealthTrendPoint> data = healthLogRepository
                .findAllByVisitIdOrderByRecordedAtAsc(visitId)
                .stream()
                .map(log -> new HealthTrendPoint(
                        log.getRecordedAt().toLocalDate(),
                        log.getSymptomSeverity(),
                        log.getBodyTemperature()
                ))
                .toList();

        return new HealthTrendResponse(data);
    }

    public LifestyleTrendResponse getLifestyleTrend(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        List<LifestyleTrendPoint> data = healthLogRepository
                .findAllByVisitIdOrderByRecordedAtAsc(visitId)
                .stream()
                .map(log -> new LifestyleTrendPoint(
                        log.getRecordedAt().toLocalDate(),
                        log.getSleepHours(),
                        log.getWaterIntakeMl(),
                        log.getActivityMinutes()
                ))
                .toList();

        return new LifestyleTrendResponse(data);
    }

    public TreatmentSummaryResponse getTreatmentSummary(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);

        List<HealthLog> logs = healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(visitId);
        Integer initialSeverity = logs.isEmpty() ? null : logs.get(0).getSymptomSeverity();
        Integer finalSeverity = logs.isEmpty() ? null : logs.get(logs.size() - 1).getSymptomSeverity();
        var initialTemp = logs.isEmpty() ? null : logs.get(0).getBodyTemperature();
        var finalTemp = logs.isEmpty() ? null : logs.get(logs.size() - 1).getBodyTemperature();
        List<String> majorSideEffects = collectSideEffects(logs);

        return new TreatmentSummaryResponse(
                initialSeverity,
                finalSeverity,
                initialTemp,
                finalTemp,
                majorSideEffects,
                adherenceRate(visitId)
        );
    }

    public TreatmentComparisonChartResponse getTreatmentComparisonChart(Long userId, Long visitId) {
        Visit current = visitService.getOwnedVisit(userId, visitId);

        String category = current.getDepartmentName() == null ? "" : current.getDepartmentName();
        Visit past = visitRepository
                .findAllByUserIdAndDepartmentNameContainingIgnoreCaseOrderByVisitedAtDesc(userId, category)
                .stream()
                .filter(v -> !v.getId().equals(visitId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "비교할 과거 치료 기록이 없습니다."));

        List<HealthLog> currentLogs = healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(visitId);
        List<HealthLog> pastLogs = healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(past.getId());

        TreatmentChartData currentTreatment = createTreatmentChartData(visitId, currentLogs);
        TreatmentChartData pastTreatment = createTreatmentChartData(past.getId(), pastLogs);

        return new TreatmentComparisonChartResponse(currentTreatment, pastTreatment);
    }

    private double adherenceRate(Long visitId) {
        List<MedicationDose> doses = medicationDoseRepository.findAllByMedicationPrescriptionVisitId(visitId);
        List<MedicationDose> completedDoses = doses.stream()
                .filter(dose -> dose.getDoseStatus() != DoseStatus.PENDING)
                .toList();

        if (completedDoses.isEmpty()) {
            return 0.0;
        }

        long taken = completedDoses.stream()
                .filter(dose -> dose.getDoseStatus() == DoseStatus.TAKEN)
                .count();

        return (double) taken * 100.0 / completedDoses.size();
    }

    private List<String> collectSideEffects(List<HealthLog> logs) {
        Set<String> values = new LinkedHashSet<>();

        for (HealthLog log : logs) {
            String sideEffects = log.getSideEffects();

            if (sideEffects == null || sideEffects.isBlank()) {
                continue;
            }

            String[] items = sideEffects.split("\\n");

            for (String item : items) {
                if (!item.isBlank()) {
                    values.add(item.trim());
                }
            }
        }

        return List.copyOf(values);
    }

    private TreatmentChartData createTreatmentChartData(
            Long visitId,
            List<HealthLog> logs
    ) {
        List<SymptomTrendPoint> symptomTrend = logs.stream()
                .map(log -> new SymptomTrendPoint(
                        log.getRecordedAt().toLocalDate(),
                        log.getSymptomSeverity()
                ))
                .toList();

        Integer finalSymptomSeverity = logs.isEmpty()
                ? null
                : logs.get(logs.size() - 1).getSymptomSeverity();

        return new TreatmentChartData(
                visitId,
                symptomTrend,
                adherenceRate(visitId),
                finalSymptomSeverity
        );
    }
}
