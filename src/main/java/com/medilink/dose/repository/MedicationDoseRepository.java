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
}
