package com.medilink.report.repository;

import com.medilink.report.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findAllByVisitIdOrderByGeneratedAtDesc(Long visitId);

    Optional<Report> findFirstByVisitIdOrderByGeneratedAtDesc(Long visitId);

    Optional<Report> findByIdAndVisitUserId(Long id, Long userId);
}
