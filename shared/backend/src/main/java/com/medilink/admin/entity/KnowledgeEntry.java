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

    // 음주·식전식후·자몽·운전 같은 생활습관 안내가 들어간다.
    // RAG 검색이 이 내용으로 답하는 질문이 많아 색인에 함께 싣는다.
    @Column(columnDefinition = "TEXT")
    private String precautions;

    public KnowledgeEntry(
            String itemSeq,
            String medicationName,
            String purpose,
            String sideEffects,
            String precautions
    ) {
        update(itemSeq, medicationName, purpose, sideEffects, precautions);
    }

    public void update(
            String itemSeq,
            String medicationName,
            String purpose,
            String sideEffects,
            String precautions
    ) {
        this.itemSeq = itemSeq;
        this.medicationName = medicationName;
        this.purpose = purpose;
        this.sideEffects = sideEffects;
        this.precautions = precautions;
    }
}
