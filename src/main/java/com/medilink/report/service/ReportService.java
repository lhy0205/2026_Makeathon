package com.medilink.report.service;

import com.medilink.ai.client.ReportAiClient;
import com.medilink.ai.dto.GeneratedReport;
import com.medilink.ai.dto.ReportGenerationRequest;
import com.medilink.global.exception.ApiException;
import com.medilink.healthlog.entity.HealthLog;
import com.medilink.healthlog.repository.HealthLogRepository;
import com.medilink.medication.entity.Medication;
import com.medilink.medication.repository.MedicationRepository;
import com.medilink.prescription.entity.Prescription;
import com.medilink.prescription.repository.PrescriptionRepository;
import com.medilink.report.dto.ReportResponse;
import com.medilink.report.entity.Report;
import com.medilink.report.repository.ReportRepository;
import com.medilink.visit.entity.Visit;
import com.medilink.visit.service.VisitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final HealthLogRepository healthLogRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;
    private final VisitService visitService;
    private final ReportAiClient reportAiClient;

    @Transactional
    public ReportResponse generateReport(Long userId, Long visitId) {
        Visit visit = visitService.getOwnedVisit(userId, visitId);

        List<Medication> medications = prescriptionRepository.findFirstByVisitIdOrderByCreatedAtDesc(visitId)
                .map(Prescription::getId)
                .map(medicationRepository::findAllByPrescriptionIdOrderById)
                .orElse(List.of());
        List<HealthLog> healthLogs = healthLogRepository.findAllByVisitIdOrderByRecordedAtAsc(visitId);

        ReportGenerationRequest aiRequest = new ReportGenerationRequest(
                visitId,
                new ReportGenerationRequest.VisitSummary(
                        visit.getHospitalName(),
                        visit.getDepartmentName(),
                        visit.getVisitReason(),
                        visit.getMedicationStartDate(),
                        visit.getMedicationEndDate()
                ),
                medications.stream()
                        .map(m -> new ReportGenerationRequest.MedicationSummary(
                                m.getMedicationName(),
                                m.getDosage() == null ? null : m.getDosage().toString(),
                                m.getPurpose()
                        ))
                        .toList(),
                healthLogs.stream()
                        .map(h -> new ReportGenerationRequest.HealthLogSummary(
                                h.getRecordedAt(),
                                h.getSymptomName(),
                                h.getSymptomSeverity(),
                                h.getSideEffects(),
                                h.getBodyTemperature(),
                                h.getSleepHours()
                        ))
                        .toList()
        );

        GeneratedReport generated = reportAiClient.generateReport(aiRequest);

        Report report = new Report(
                visit,
                generated.summary(),
                generated.symptomChanges(),
                generated.suspectedSideEffects(),
                generated.lifestyleSummary(),
                generated.doctorNotes()
        );
        return ReportResponse.from(reportRepository.save(report));
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> getReports(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        return reportRepository.findAllByVisitIdOrderByGeneratedAtDesc(visitId)
                .stream()
                .map(ReportResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ReportResponse getLatestReport(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        Report report = reportRepository.findFirstByVisitIdOrderByGeneratedAtDesc(visitId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "생성된 리포트가 없습니다."));
        return ReportResponse.from(report);
    }

    @Transactional(readOnly = true)
    public ReportResponse getReport(Long userId, Long reportId) {
        return ReportResponse.from(getOwnedReport(userId, reportId));
    }

    @Transactional
    public void deleteReport(Long userId, Long reportId) {
        reportRepository.delete(getOwnedReport(userId, reportId));
    }

    private Report getOwnedReport(Long userId, Long reportId) {
        return reportRepository.findByIdAndVisitUserId(reportId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "리포트를 찾을 수 없습니다."));
    }
}
