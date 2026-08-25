package com.medilink.medication.service;

import com.medilink.global.exception.ApiException;
import com.medilink.medication.entity.Medication;
import com.medilink.medication.repository.MedicationRepository;
import com.medilink.prescription.dto.MedicationRequest;
import com.medilink.prescription.dto.MedicationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MedicationService {

    private final MedicationRepository medicationRepository;

    @Transactional
    public MedicationResponse updateMedication(
            Long userId,
            Long medicationId,
            MedicationRequest request
    ) {
        Medication medication = getOwnedMedication(userId, medicationId);
        medication.update(
                request.medicationName(),
                request.itemSeq(),
                request.dosage(),
                request.doseUnit(),
                request.frequencyPerDay(),
                request.durationDays(),
                request.instructions(),
                request.purpose(),
                request.sideEffectSummary(),
                request.confidence(),
                Boolean.TRUE.equals(request.unmatched())
        );

        return MedicationResponse.from(medication);
    }

    @Transactional
    public void deleteMedication(Long userId, Long medicationId) {
        Medication medication = getOwnedMedication(userId, medicationId);
        medicationRepository.delete(medication);
    }

    public Medication getOwnedMedication(Long userId, Long medicationId) {
        return medicationRepository.findByIdAndPrescriptionVisitUserId(medicationId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "약 정보를 찾을 수 없습니다."));
    }
}
