package com.medilink.interaction.entity;

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

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "medication_interactions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicationInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_a_id", nullable = false)
    private Medication medicationA;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medication_b_id", nullable = false)
    private Medication medicationB;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private InteractionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InteractionSeverity severity;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 255)
    private String source;

    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt;

    public MedicationInteraction(
            Long userId,
            Medication medicationA,
            Medication medicationB,
            InteractionType type,
            InteractionSeverity severity,
            String reason,
            String source
    ) {
        this.userId = userId;
        this.medicationA = medicationA;
        this.medicationB = medicationB;
        this.type = type;
        this.severity = severity;
        this.reason = reason;
        this.source = source;
        this.checkedAt = LocalDateTime.now();
    }
}
