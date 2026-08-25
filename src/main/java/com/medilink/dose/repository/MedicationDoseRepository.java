package com.medilink.dose.repository;

import com.medilink.dose.entity.DoseStatus;
import com.medilink.dose.entity.MedicationDose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MedicationDoseRepository extends JpaRepository<MedicationDose, Long> {

    List<MedicationDose> findAllByMedicationPrescriptionVisitUserIdAndScheduledAtBetweenOrderByScheduledAt(
            Long userId,
            LocalDateTime start,
            LocalDateTime end
    );

    Optional<MedicationDose> findByIdAndMedicationPrescriptionVisitUserId(Long id, Long userId);

    List<MedicationDose> findAllByDoseStatusAndReminderSentAtIsNullAndScheduledAtBetween(
            DoseStatus status,
            LocalDateTime start,
            LocalDateTime end
    );

    // 시각화(visualization) 도메인에서 특정 방문의 복약률을 계산할 때 사용.
    List<MedicationDose> findAllByMedicationPrescriptionVisitId(Long visitId);

    // 치료 한 건의 복약 일정 전체. 앱의 복약 진행률 표시에 쓴다.
    List<MedicationDose> findAllByMedicationPrescriptionVisitIdOrderByScheduledAt(Long visitId);

    List<MedicationDose> findAllByDoseStatusAndScheduledAtBefore(
            DoseStatus status,
            LocalDateTime scheduledAt
    );

    long countByDoseStatus(DoseStatus status);

    // 관리자 화면: 한 사용자의 복약 일정 전체
    List<MedicationDose> findAllByMedicationPrescriptionVisitUserId(Long userId);
}
