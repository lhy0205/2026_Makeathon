package com.medilink.prescription.service;

import com.medilink.ai.client.AiClient;
import com.medilink.ai.dto.PrescriptionAnalysisResult;
import com.medilink.global.exception.ApiException;
import com.medilink.medication.entity.Medication;
import com.medilink.medication.repository.MedicationRepository;
import com.medilink.prescription.dto.ConfirmPrescriptionRequest;
import com.medilink.prescription.dto.MedicationRequest;
import com.medilink.prescription.dto.MedicationResponse;
import com.medilink.prescription.dto.PrescriptionResponse;
import com.medilink.prescription.entity.Prescription;
import com.medilink.prescription.repository.PrescriptionRepository;
import com.medilink.visit.entity.Visit;
import com.medilink.visit.service.VisitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final AiClient aiClient;
    private final VisitService visitService;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;

    @Transactional(readOnly = true)
    public PrescriptionAnalysisResult scanPrescription(
            Long userId,
            Long visitId,
            MultipartFile image
    ) {
        visitService.getOwnedVisit(userId, visitId);

        if (image.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "처방전 이미지를 선택해 주세요.");
        }

        return aiClient.analyzePrescription(image);
    }

    @Transactional
    public PrescriptionResponse confirmPrescription(
            Long userId,
            Long visitId,
            ConfirmPrescriptionRequest request
    ) {
        Visit visit = visitService.getOwnedVisit(userId, visitId);
        Prescription prescription = new Prescription(
                visit,
                request.imageUrl(),
                request.rawOcrText()
        );

        Prescription savedPrescription = prescriptionRepository.save(prescription);
        List<Medication> medications = new ArrayList<>();

        for (MedicationRequest medicationRequest : request.medications()) {
            Medication medication = createMedication(savedPrescription, medicationRequest);
            medications.add(medication);
        }

        List<Medication> savedMedications = medicationRepository.saveAll(medications);
        visit.startTreatment();

        return createResponse(savedPrescription, savedMedications);
    }

    @Transactional(readOnly = true)
    public PrescriptionResponse getPrescription(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);

        Prescription prescription = prescriptionRepository.findFirstByVisitIdOrderByCreatedAtDesc(visitId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "처방전을 찾을 수 없습니다."));

        List<Medication> medications = medicationRepository.findAllByPrescriptionIdOrderById(prescription.getId());

        return createResponse(prescription, medications);
    }

    private Medication createMedication(
            Prescription prescription,
            MedicationRequest request
    ) {
        return new Medication(
                prescription,
                request.medicationName(),
                request.dosage(),
                request.doseUnit(),
                request.frequencyPerDay(),
                request.durationDays(),
                request.instructions(),
                request.purpose(),
                request.sideEffectSummary()
        );
    }

    private PrescriptionResponse createResponse(
            Prescription prescription,
            List<Medication> medications
    ) {
        List<MedicationResponse> medicationResponses = medications
                .stream()
                .map(MedicationResponse::from)
                .toList();

        return PrescriptionResponse.from(prescription, medicationResponses);
    }
}
