package com.medilink.comparison.entity;

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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "treatment_comparisons")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TreatmentComparison {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "current_visit_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Visit currentVisit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "past_visit_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Visit pastVisit;

    @Column(name = "common_points", columnDefinition = "TEXT")
    private String commonPoints;

    @Column(columnDefinition = "TEXT")
    private String differences;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public TreatmentComparison(
            Visit currentVisit,
            Visit pastVisit,
            String commonPoints,
            String differences,
            String summary
    ) {
        this.currentVisit = currentVisit;
        this.pastVisit = pastVisit;
        this.commonPoints = commonPoints;
        this.differences = differences;
        this.summary = summary;
    }
}
