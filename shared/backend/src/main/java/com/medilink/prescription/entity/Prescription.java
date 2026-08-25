package com.medilink.prescription.entity;

import com.medilink.visit.entity.Visit;
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
@Table(name = "prescriptions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "raw_ocr_text", columnDefinition = "TEXT")
    private String rawOcrText;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", nullable = false, length = 50)
    private AnalysisStatus analysisStatus;

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Prescription(Visit visit, String imageUrl, String rawOcrText) {
        this.visit = visit;
        this.imageUrl = imageUrl;
        this.rawOcrText = rawOcrText;
        this.analysisStatus = AnalysisStatus.COMPLETED;
        this.analyzedAt = LocalDateTime.now();
    }
}
