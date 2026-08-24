package com.medilink.dose.entity;

import com.medilink.medication.entity.Medication;
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
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "medication_doses")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicationDose {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_id", nullable = false)
    private Medication medication;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "dose_status", nullable = false, length = 20)
    private DoseStatus doseStatus;

    @Column(name = "taken_at")
    private LocalDateTime takenAt;

    @Column(name = "reminder_sent_at")
    private LocalDateTime reminderSentAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public MedicationDose(Medication medication, LocalDateTime scheduledAt) {
        this.medication = medication;
        this.scheduledAt = scheduledAt;
        this.doseStatus = DoseStatus.PENDING;
    }

    public void markTaken(LocalDateTime takenAt) {
        this.doseStatus = DoseStatus.TAKEN;
        this.takenAt = takenAt;
    }

    public void markSkipped() {
        this.doseStatus = DoseStatus.SKIPPED;
        this.takenAt = null;
    }

    public void markReminderSent(LocalDateTime sentAt) {
        this.reminderSentAt = sentAt;
    }
}
