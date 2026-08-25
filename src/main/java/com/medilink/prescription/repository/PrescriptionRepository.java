package com.medilink.prescription.repository;

import com.medilink.prescription.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    Optional<Prescription> findFirstByVisitIdOrderByCreatedAtDesc(Long visitId);

    Optional<Prescription> findByIdAndVisitUserId(Long id, Long userId);
}
