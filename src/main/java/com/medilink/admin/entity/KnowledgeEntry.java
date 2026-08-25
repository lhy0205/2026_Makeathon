package com.medilink.admin.entity;

import com.medilink.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "knowledge_entries")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class KnowledgeEntry extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_seq", nullable = false, unique = true, length = 20)
    private String itemSeq;

    @Column(name = "medication_name", nullable = false)
    private String medicationName;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "side_effects", columnDefinition = "TEXT")
    private String sideEffects;

    public KnowledgeEntry(
            String itemSeq,
            String medicationName,
            String purpose,
            String sideEffects
    ) {
        update(itemSeq, medicationName, purpose, sideEffects);
    }

    public void update(
            String itemSeq,
            String medicationName,
            String purpose,
            String sideEffects
    ) {
        this.itemSeq = itemSeq;
        this.medicationName = medicationName;
        this.purpose = purpose;
        this.sideEffects = sideEffects;
    }
}
