package com.medilink.healthlog.repository;

import com.medilink.healthlog.entity.HealthLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface HealthLogRepository extends JpaRepository<HealthLog, Long> {

    List<HealthLog> findAllByVisitIdOrderByRecordedAtAsc(Long visitId);

    boolean existsByVisitIdAndRecordedAtBetween(Long visitId, LocalDateTime start, LocalDateTime end);

    Optional<HealthLog> findByIdAndVisitUserId(Long id, Long userId);
}
