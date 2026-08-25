package com.medilink.visit.repository;

import com.medilink.visit.entity.Visit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface VisitRepository extends JpaRepository<Visit, Long> {

    List<Visit> findAllByUserIdOrderByVisitedAtDesc(Long userId);

    Optional<Visit> findByIdAndUserId(Long id, Long userId);

    List<Visit> findAllByUserIdAndVisitedAtBetweenOrderByVisitedAt(
            Long userId,
            LocalDate startDate,
            LocalDate endDate
    );

    List<Visit> findAllByUserIdAndDepartmentNameContainingIgnoreCaseOrderByVisitedAtDesc(
            Long userId,
            String departmentName
    );
}
