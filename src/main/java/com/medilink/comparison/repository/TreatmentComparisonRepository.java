package com.medilink.comparison.repository;

import com.medilink.comparison.entity.TreatmentComparison;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TreatmentComparisonRepository extends JpaRepository<TreatmentComparison, Long> {

    Optional<TreatmentComparison> findFirstByCurrentVisitIdOrderByCreatedAtDesc(Long currentVisitId);
}
