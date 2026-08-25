package com.medilink.medication.entity;

import com.medilink.prescription.entity.Prescription;
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
@Table(name = "medications")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @Column(name = "medication_name", nullable = false)
    private String medicationName;

    @Column(name = "item_seq", length = 20)
    private String itemSeq;

    @Column(precision = 10, scale = 2)
    private BigDecimal dosage;

    @Column(name = "dose_unit", length = 20)
    private String doseUnit;

    @Column(name = "frequency_per_day")
    private Integer frequencyPerDay;

    @Column(name = "duration_days")
    private Integer durationDays;

    @Column(length = 500)
    private String instructions;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "side_effect_summary", columnDefinition = "TEXT")
    private String sideEffectSummary;

    @Column(name = "ocr_confidence")
    private Double ocrConfidence;

    @Column(name = "ocr_unmatched", nullable = false)
    private boolean ocrUnmatched;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Medication(
            Prescription prescription,
            String medicationName,
            String itemSeq,
            BigDecimal dosage,
            String doseUnit,
            Integer frequencyPerDay,
            Integer durationDays,
            String instructions,
            String purpose,
            String sideEffectSummary,
            Double ocrConfidence,
            boolean ocrUnmatched
    ) {
        this.prescription = prescription;
        this.medicationName = medicationName;
        this.itemSeq = itemSeq;
        this.dosage = dosage;
        this.doseUnit = doseUnit;
        this.frequencyPerDay = frequencyPerDay;
        this.durationDays = durationDays;
        this.instructions = instructions;
        this.purpose = purpose;
        this.sideEffectSummary = sideEffectSummary;
        this.ocrConfidence = ocrConfidence;
        this.ocrUnmatched = ocrUnmatched;
    }

    public void update(
            String medicationName,
            String itemSeq,
            BigDecimal dosage,
            String doseUnit,
            Integer frequencyPerDay,
            Integer durationDays,
            String instructions,
            String purpose,
            String sideEffectSummary,
            Double ocrConfidence,
            boolean ocrUnmatched
    ) {
        this.medicationName = medicationName;
        this.itemSeq = itemSeq;
        this.dosage = dosage;
        this.doseUnit = doseUnit;
        this.frequencyPerDay = frequencyPerDay;
        this.durationDays = durationDays;
        this.instructions = instructions;
        this.purpose = purpose;
        this.sideEffectSummary = sideEffectSummary;
        this.ocrConfidence = ocrConfidence;
        this.ocrUnmatched = ocrUnmatched;
    }
}
