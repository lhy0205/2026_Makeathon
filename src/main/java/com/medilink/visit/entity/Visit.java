package com.medilink.visit.entity;

import com.medilink.global.entity.BaseTimeEntity;
import com.medilink.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

import java.time.LocalDate;

@Getter
@Entity
@Table(name = "visits")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Visit extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "hospital_name", nullable = false)
    private String hospitalName;

    @Column(name = "department_name", length = 100)
    private String departmentName;

    @Column(name = "visited_at", nullable = false)
    private LocalDate visitedAt;

    @Column(name = "visit_reason", columnDefinition = "TEXT")
    private String visitReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "treatment_status", nullable = false, length = 50)
    private TreatmentStatus treatmentStatus;

    @Column(name = "medication_start_date")
    private LocalDate medicationStartDate;

    @Column(name = "medication_end_date")
    private LocalDate medicationEndDate;

    public Visit(
            User user,
            String hospitalName,
            String departmentName,
            LocalDate visitedAt,
            String visitReason,
            LocalDate medicationStartDate,
            LocalDate medicationEndDate
    ) {
        this.user = user;
        this.hospitalName = hospitalName;
        this.departmentName = departmentName;
        this.visitedAt = visitedAt;
        this.visitReason = visitReason;
        this.treatmentStatus = TreatmentStatus.REGISTERED;
        this.medicationStartDate = medicationStartDate;
        this.medicationEndDate = medicationEndDate;
    }

    public void update(
            String hospitalName,
            String departmentName,
            LocalDate visitedAt,
            String visitReason,
            LocalDate medicationStartDate,
            LocalDate medicationEndDate
    ) {
        this.hospitalName = hospitalName;
        this.departmentName = departmentName;
        this.visitedAt = visitedAt;
        this.visitReason = visitReason;
        this.medicationStartDate = medicationStartDate;
        this.medicationEndDate = medicationEndDate;
    }

    public void startTreatment() {
        this.treatmentStatus = TreatmentStatus.IN_PROGRESS;
    }

    public void complete(LocalDate completedAt) {
        this.treatmentStatus = TreatmentStatus.COMPLETED;
        this.medicationEndDate = completedAt;
    }
}
