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

    // 과거 치료 기록 비교(comparison)/시각화(visualization) 도메인에서 사용.
    // 스키마에 별도 증상/질환 카테고리 컬럼이 없어 진료과명으로 느슨하게 매칭한다.
    List<Visit> findAllByUserIdAndDepartmentNameContainingIgnoreCaseOrderByVisitedAtDesc(
            Long userId,
            String departmentName
    );
}
