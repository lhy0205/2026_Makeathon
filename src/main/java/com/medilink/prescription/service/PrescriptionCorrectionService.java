package com.medilink.prescription.service;

import com.medilink.global.exception.ApiException;
import com.medilink.prescription.dto.PrescriptionCorrectionRequest;
import com.medilink.prescription.dto.PrescriptionCorrectionResponse;
import com.medilink.prescription.entity.Prescription;
import com.medilink.prescription.entity.PrescriptionCorrection;
import com.medilink.prescription.repository.PrescriptionCorrectionRepository;
import com.medilink.prescription.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PrescriptionCorrectionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionCorrectionRepository correctionRepository;

    @Transactional
    public PrescriptionCorrectionResponse create(
            Long userId,
            Long prescriptionId,
            PrescriptionCorrectionRequest request
    ) {
        Prescription prescription = prescriptionRepository.findByIdAndVisitUserId(prescriptionId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "처방전을 찾을 수 없습니다."));

        PrescriptionCorrection correction = new PrescriptionCorrection(
                prescription,
                request.ocrText(),
                request.correctedName(),
                request.itemSeq()
        );

        return PrescriptionCorrectionResponse.from(correctionRepository.save(correction));
    }

    @Transactional(readOnly = true)
    public List<PrescriptionCorrectionResponse> getAllForAi() {
        return correctionRepository.findAllByOrderByCreatedAtAsc()
                .stream()
                .map(PrescriptionCorrectionResponse::from)
                .toList();
    }
}
