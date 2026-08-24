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
import com.medilink.visualization.dto.LifestyleTrendPoint;
import com.medilink.visualization.dto.TreatmentComparisonChartResponse;
import com.medilink.visualization.dto.TreatmentSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VisualizationService {

    private final HealthLogRepository healthLogRepository;
    private final MedicationDoseRepository medicationDoseRepository;
    private final VisitRepository visitRepository;
    private final VisitService visitService;

    public List<HealthTrendPoint> getHealthTrend(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        return healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(visitId).stream()
                .map(h -> new HealthTrendPoint(h.getRecordedAt(), h.getSymptomName(), h.getSymptomSeverity(), h.getBodyTemperature()))
                .toList();
    }

    public List<LifestyleTrendPoint> getLifestyleTrend(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        return healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(visitId).stream()
                .map(h -> new LifestyleTrendPoint(h.getRecordedAt(), h.getSleepHours(), h.getWaterIntakeMl(), h.getActivityMinutes()))
                .toList();
    }

    public TreatmentSummaryResponse getTreatmentSummary(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);

        List<HealthLog> logs = healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(visitId);
        Integer initialSeverity = logs.isEmpty() ? null : logs.get(0).getSymptomSeverity();
        Integer finalSeverity = logs.isEmpty() ? null : logs.get(logs.size() - 1).getSymptomSeverity();
        var initialTemp = logs.isEmpty() ? null : logs.get(0).getBodyTemperature();
        var finalTemp = logs.isEmpty() ? null : logs.get(logs.size() - 1).getBodyTemperature();
        long sideEffectCount = logs.stream()
                .filter(h -> h.getSideEffects() != null && !h.getSideEffects().isBlank())
                .count();

        List<MedicationDose> doses = medicationDoseRepository.findAllByMedicationPrescriptionVisitId(visitId);
        long totalDoses = doses.size();
        long takenDoses = doses.stream().filter(d -> d.getDoseStatus() == DoseStatus.TAKEN).count();
        double adherenceRate = totalDoses == 0 ? 0.0 : (double) takenDoses / totalDoses;

        return new TreatmentSummaryResponse(
                initialSeverity, finalSeverity, initialTemp, finalTemp,
                sideEffectCount, totalDoses, takenDoses, adherenceRate
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

        return new TreatmentComparisonChartResponse(
                visitId, past.getId(),
                currentLogs.isEmpty() ? null : currentLogs.get(0).getSymptomSeverity(),
                currentLogs.isEmpty() ? null : currentLogs.get(currentLogs.size() - 1).getSymptomSeverity(),
                pastLogs.isEmpty() ? null : pastLogs.get(0).getSymptomSeverity(),
                pastLogs.isEmpty() ? null : pastLogs.get(pastLogs.size() - 1).getSymptomSeverity(),
                adherenceRate(visitId), adherenceRate(past.getId()),
                current.getTreatmentStatus().name(), past.getTreatmentStatus().name()
        );
    }

    private double adherenceRate(Long visitId) {
        List<MedicationDose> doses = medicationDoseRepository.findAllByMedicationPrescriptionVisitId(visitId);
        if (doses.isEmpty()) {
            return 0.0;
        }
        long taken = doses.stream().filter(d -> d.getDoseStatus() == DoseStatus.TAKEN).count();
        return (double) taken / doses.size();
    }
}
