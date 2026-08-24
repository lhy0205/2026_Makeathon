package com.medilink.report.entity;

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

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "reports")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_id", nullable = false)
    private Visit visit;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "symptom_changes", columnDefinition = "TEXT")
    private String symptomChanges;

    @Column(name = "suspected_side_effects", columnDefinition = "TEXT")
    private String suspectedSideEffects;

    @Column(name = "lifestyle_summary", columnDefinition = "TEXT")
    private String lifestyleSummary;

    @Column(name = "doctor_notes", columnDefinition = "TEXT")
    private String doctorNotes;

    // 스키마에 DEFAULT CURRENT_TIMESTAMP가 없어 Hibernate가 insert 시점에 직접 채운다.
    @CreationTimestamp
    @Column(name = "generated_at", nullable = false, updatable = false)
    private LocalDateTime generatedAt;

    public Report(
            Visit visit,
            String summary,
            String symptomChanges,
            String suspectedSideEffects,
            String lifestyleSummary,
            String doctorNotes
    ) {
        this.visit = visit;
        this.summary = summary;
        this.symptomChanges = symptomChanges;
        this.suspectedSideEffects = suspectedSideEffects;
        this.lifestyleSummary = lifestyleSummary;
        this.doctorNotes = doctorNotes;
    }
}
