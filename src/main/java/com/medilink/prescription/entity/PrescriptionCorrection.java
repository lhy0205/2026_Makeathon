package com.medilink.prescription.entity;

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

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "prescription_corrections")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PrescriptionCorrection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @Column(name = "ocr_text", nullable = false, length = 500)
    private String ocrText;

    @Column(name = "corrected_name", nullable = false, length = 255)
    private String correctedName;

    @Column(name = "item_seq", length = 20)
    private String itemSeq;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PrescriptionCorrection(
            Prescription prescription,
            String ocrText,
            String correctedName,
            String itemSeq
    ) {
        this.prescription = prescription;
        this.ocrText = ocrText;
        this.correctedName = correctedName;
        this.itemSeq = itemSeq;
    }
}
