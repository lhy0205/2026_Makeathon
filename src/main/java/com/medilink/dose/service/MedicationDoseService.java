package com.medilink.dose.service;

import com.medilink.dose.dto.CreateDosesRequest;
import com.medilink.dose.dto.MarkDoseTakenRequest;
import com.medilink.dose.dto.MedicationDoseResponse;
import com.medilink.dose.entity.MedicationDose;
import com.medilink.dose.repository.MedicationDoseRepository;
import com.medilink.global.exception.ApiException;
import com.medilink.medication.entity.Medication;
import com.medilink.medication.service.MedicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicationDoseService {

    private final MedicationService medicationService;
    private final MedicationDoseRepository medicationDoseRepository;

    @Transactional
    public List<MedicationDoseResponse> createMedicationDoses(
            Long userId,
            Long medicationId,
            CreateDosesRequest request
    ) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "복약 종료일은 시작일보다 빠를 수 없습니다.");
        }

        Medication medication = medicationService.getOwnedMedication(userId, medicationId);
        List<MedicationDose> doses = new ArrayList<>();
        LocalDate date = request.startDate();

        while (!date.isAfter(request.endDate())) {
            for (LocalTime time : request.times()) {
                LocalDateTime scheduledAt = LocalDateTime.of(date, time);
                MedicationDose dose = new MedicationDose(medication, scheduledAt);
                doses.add(dose);
            }

            date = date.plusDays(1);
        }

        List<MedicationDose> savedDoses = medicationDoseRepository.saveAll(doses);

        return toResponses(savedDoses);
    }

    @Transactional(readOnly = true)
    public List<MedicationDoseResponse> getTodayDoses(Long userId) {
        return getDosesByDate(userId, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<MedicationDoseResponse> getDosesByDate(Long userId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);

        List<MedicationDose> doses = medicationDoseRepository
                .findAllByMedicationPrescriptionVisitUserIdAndScheduledAtBetweenOrderByScheduledAt(
                        userId,
                        start,
                        end
                );

        return toResponses(doses);
    }

    @Transactional
    public MedicationDoseResponse markDoseAsTaken(
            Long userId,
            Long doseId,
            MarkDoseTakenRequest request
    ) {
        MedicationDose dose = getOwnedDose(userId, doseId);
        dose.markTaken(request.takenAt());

        return MedicationDoseResponse.from(dose);
    }

    @Transactional
    public MedicationDoseResponse markDoseAsSkipped(Long userId, Long doseId) {
        MedicationDose dose = getOwnedDose(userId, doseId);
        dose.markSkipped();

        return MedicationDoseResponse.from(dose);
    }

    private MedicationDose getOwnedDose(Long userId, Long doseId) {
        return medicationDoseRepository.findByIdAndMedicationPrescriptionVisitUserId(doseId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "복약 일정을 찾을 수 없습니다."));
    }

    private List<MedicationDoseResponse> toResponses(List<MedicationDose> doses) {
        return doses
                .stream()
                .map(MedicationDoseResponse::from)
                .toList();
    }
}
