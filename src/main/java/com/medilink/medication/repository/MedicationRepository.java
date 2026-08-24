package com.medilink.medication.repository;

import com.medilink.medication.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MedicationRepository extends JpaRepository<Medication, Long> {

    List<Medication> findAllByPrescriptionIdOrderById(Long prescriptionId);

    Optional<Medication> findByIdAndPrescriptionVisitUserId(Long id, Long userId);
}
