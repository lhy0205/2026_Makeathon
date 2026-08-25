package com.medilink.admin.service;

import com.medilink.admin.client.KnowledgeReindexClient;
import com.medilink.admin.dto.AdminDashboardResponse;
import com.medilink.admin.dto.KnowledgeEntryRequest;
import com.medilink.admin.dto.KnowledgeEntryResponse;
import com.medilink.admin.dto.KnowledgeReindexResponse;
import com.medilink.admin.dto.OcrFailureResponse;
import com.medilink.admin.entity.KnowledgeEntry;
import com.medilink.admin.repository.KnowledgeEntryRepository;
import com.medilink.dose.entity.DoseStatus;
import com.medilink.dose.repository.MedicationDoseRepository;
import com.medilink.global.exception.ApiException;
import com.medilink.medication.repository.MedicationRepository;
import com.medilink.prescription.repository.PrescriptionRepository;
import com.medilink.user.dto.UserResponse;
import com.medilink.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;
    private final MedicationDoseRepository medicationDoseRepository;
    private final KnowledgeEntryRepository knowledgeEntryRepository;
    private final KnowledgeReindexClient knowledgeReindexClient;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {
        long doseCount = medicationDoseRepository.count();
        long takenCount = medicationDoseRepository.countByDoseStatus(DoseStatus.TAKEN);
        long medicationCount = medicationRepository.count();
        long unmatchedCount = medicationRepository.countByOcrUnmatchedTrue();

        return new AdminDashboardResponse(
                userRepository.count(),
                prescriptionRepository.count(),
                percentage(takenCount, doseCount),
                percentage(unmatchedCount, medicationCount)
        );
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OcrFailureResponse> getOcrFailures() {
        return medicationRepository.findAllByOcrUnmatchedTrueOrderByCreatedAtDesc()
                .stream()
                .map(OcrFailureResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<KnowledgeEntryResponse> getKnowledgeEntries() {
        return knowledgeEntryRepository.findAllByOrderByMedicationNameAsc()
                .stream()
                .map(KnowledgeEntryResponse::from)
                .toList();
    }

    @Transactional
    public KnowledgeEntryResponse createKnowledgeEntry(KnowledgeEntryRequest request) {
        if (knowledgeEntryRepository.existsByItemSeq(request.itemSeq())) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 등록된 품목기준코드입니다.");
        }

        KnowledgeEntry entry = new KnowledgeEntry(
                request.itemSeq(),
                request.medicationName(),
                request.purpose(),
                request.sideEffects()
        );

        return KnowledgeEntryResponse.from(knowledgeEntryRepository.save(entry));
    }

    @Transactional
    public KnowledgeEntryResponse updateKnowledgeEntry(Long knowledgeId, KnowledgeEntryRequest request) {
        KnowledgeEntry entry = getKnowledgeEntry(knowledgeId);
        entry.update(
                request.itemSeq(),
                request.medicationName(),
                request.purpose(),
                request.sideEffects()
        );

        return KnowledgeEntryResponse.from(entry);
    }

    @Transactional
    public void deleteKnowledgeEntry(Long knowledgeId) {
        knowledgeEntryRepository.delete(getKnowledgeEntry(knowledgeId));
    }

    public KnowledgeReindexResponse reindexKnowledge() {
        List<KnowledgeReindexClient.KnowledgeEntryPayload> entries = knowledgeEntryRepository.findAll()
                .stream()
                .map(entry -> new KnowledgeReindexClient.KnowledgeEntryPayload(
                        entry.getItemSeq(),
                        entry.getMedicationName(),
                        entry.getPurpose(),
                        entry.getSideEffects()
                ))
                .toList();

        return knowledgeReindexClient.reindex(entries);
    }

    private KnowledgeEntry getKnowledgeEntry(Long knowledgeId) {
        return knowledgeEntryRepository.findById(knowledgeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "지식베이스 항목을 찾을 수 없습니다."));
    }

    private double percentage(long numerator, long denominator) {
        if (denominator == 0) {
            return 0.0;
        }

        return Math.round(numerator * 1000.0 / denominator) / 10.0;
    }
}
