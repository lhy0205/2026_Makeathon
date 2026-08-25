package com.medilink.prescription.repository;

import com.medilink.prescription.entity.PrescriptionCorrection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionCorrectionRepository extends JpaRepository<PrescriptionCorrection, Long> {

    List<PrescriptionCorrection> findAllByOrderByCreatedAtAsc();
}
