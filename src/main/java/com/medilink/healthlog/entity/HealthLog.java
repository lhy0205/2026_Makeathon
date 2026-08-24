package com.medilink.healthlog.entity;

import com.medilink.visit.entity.Visit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "health_logs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HealthLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @Column(name = "symptom_name")
    private String symptomName;

    @Column(name = "symptom_severity")
    private Integer symptomSeverity;

    @Column(name = "side_effects", columnDefinition = "TEXT")
    private String sideEffects;

    @Column(name = "body_temperature", precision = 4, scale = 1)
    private BigDecimal bodyTemperature;

    @Column(name = "sleep_hours", precision = 4, scale = 1)
    private BigDecimal sleepHours;

    @Column(name = "water_intake_ml")
    private Integer waterIntakeMl;

    @Column(name = "activity_minutes")
    private Integer activityMinutes;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public HealthLog(
            Visit visit,
            LocalDateTime recordedAt,
            String symptomName,
            Integer symptomSeverity,
            String sideEffects,
            BigDecimal bodyTemperature,
            BigDecimal sleepHours,
            Integer waterIntakeMl,
            Integer activityMinutes,
            String memo
    ) {
        this.visit = visit;
        this.recordedAt = recordedAt;
        this.symptomName = symptomName;
        this.symptomSeverity = symptomSeverity;
        this.sideEffects = sideEffects;
        this.bodyTemperature = bodyTemperature;
        this.sleepHours = sleepHours;
        this.waterIntakeMl = waterIntakeMl;
        this.activityMinutes = activityMinutes;
        this.memo = memo;
    }

    public void update(
            String symptomName,
            Integer symptomSeverity,
            String sideEffects,
            BigDecimal bodyTemperature,
            BigDecimal sleepHours,
            Integer waterIntakeMl,
            Integer activityMinutes,
            String memo
    ) {
        this.symptomName = symptomName;
        this.symptomSeverity = symptomSeverity;
        this.sideEffects = sideEffects;
        this.bodyTemperature = bodyTemperature;
        this.sleepHours = sleepHours;
        this.waterIntakeMl = waterIntakeMl;
        this.activityMinutes = activityMinutes;
        this.memo = memo;
    }
}
