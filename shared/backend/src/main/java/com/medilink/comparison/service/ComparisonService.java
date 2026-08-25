package com.medilink.comparison.service;

import com.medilink.ai.client.ComparisonAiClient;
import com.medilink.ai.dto.TreatmentComparisonRequest;
import com.medilink.ai.dto.TreatmentComparisonResult;
import com.medilink.comparison.dto.ComparisonRequest;
import com.medilink.comparison.dto.ComparisonResponse;
import com.medilink.comparison.entity.TreatmentComparison;
import com.medilink.comparison.repository.TreatmentComparisonRepository;
import com.medilink.global.exception.ApiException;
import com.medilink.healthlog.entity.HealthLog;
import com.medilink.healthlog.repository.HealthLogRepository;
import com.medilink.medication.entity.Medication;
import com.medilink.medication.repository.MedicationRepository;
import com.medilink.prescription.entity.Prescription;
import com.medilink.prescription.repository.PrescriptionRepository;
import com.medilink.visit.entity.Visit;
import com.medilink.visit.dto.VisitResponse;
import com.medilink.visit.repository.VisitRepository;
import com.medilink.visit.service.VisitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComparisonService {

    private final VisitService visitService;
    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;
    private final HealthLogRepository healthLogRepository;
    private final TreatmentComparisonRepository treatmentComparisonRepository;
    private final ComparisonAiClient comparisonAiClient;

    public List<VisitResponse> getVisitsByCategory(Long userId, String category) {
        return visitRepository
                .findAllByUserIdAndDepartmentNameContainingIgnoreCaseOrderByVisitedAtDesc(
                        userId,
                        category
                )
                .stream()
                .map(VisitResponse::from)
                .toList();
    }

    @Transactional
    public ComparisonResponse compareTreatmentHistory(
            Long userId,
            Long visitId,
            ComparisonRequest request
    ) {
        Visit current = visitService.getOwnedVisit(userId, visitId);
        Visit past = visitService.getOwnedVisit(userId, request.pastVisitId());

        if (current.getId().equals(past.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "같은 방문 기록끼리는 비교할 수 없습니다.");
        }

        TreatmentComparisonRequest.TreatmentSnapshot currentSnapshot = buildSnapshot(current);
        TreatmentComparisonRequest.TreatmentSnapshot pastSnapshot = buildSnapshot(past);

        TreatmentComparisonResult result = comparisonAiClient.compareTreatments(
                new TreatmentComparisonRequest(currentSnapshot, pastSnapshot)
        );

        TreatmentComparison comparison = new TreatmentComparison(
                current,
                past,
                String.join("\n", result.commonPoints()),
                String.join("\n", result.differences()),
                result.summary()
        );
        return ComparisonResponse.from(treatmentComparisonRepository.save(comparison));
    }

    public ComparisonResponse getLatestComparison(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        TreatmentComparison comparison = treatmentComparisonRepository
                .findFirstByCurrentVisitIdOrderByCreatedAtDesc(visitId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "비교할 과거 치료 기록이 없습니다."));
        return ComparisonResponse.from(comparison);
    }

    private TreatmentComparisonRequest.TreatmentSnapshot buildSnapshot(Visit visit) {
        List<Medication> medications = prescriptionRepository.findFirstByVisitIdOrderByCreatedAtDesc(visit.getId())
                .map(Prescription::getId)
                .map(medicationRepository::findAllByPrescriptionIdOrderById)
                .orElse(List.of());
        List<HealthLog> logs = healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(visit.getId());

        Integer initialSeverity = logs.isEmpty() ? null : logs.get(0).getSymptomSeverity();
        Integer finalSeverity = logs.isEmpty() ? null : logs.get(logs.size() - 1).getSymptomSeverity();

        return new TreatmentComparisonRequest.TreatmentSnapshot(
                visit.getId(),
                visit.getHospitalName(),
                medications.stream().map(Medication::getMedicationName).toList(),
                initialSeverity,
                finalSeverity,
                visit.getTreatmentStatus().name(),
                visit.getMedicationStartDate(),
                visit.getMedicationEndDate()
        );
    }
}
