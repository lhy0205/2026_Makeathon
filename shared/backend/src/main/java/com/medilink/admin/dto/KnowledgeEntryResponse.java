package com.medilink.admin.dto;

import com.medilink.admin.entity.KnowledgeEntry;

import java.time.LocalDateTime;

public record KnowledgeEntryResponse(
        Long id,
        String itemSeq,
        String medicationName,
        String purpose,
        String sideEffects,
        LocalDateTime updatedAt
) {

    public static KnowledgeEntryResponse from(KnowledgeEntry entry) {
        return new KnowledgeEntryResponse(
                entry.getId(),
                entry.getItemSeq(),
                entry.getMedicationName(),
                entry.getPurpose(),
                entry.getSideEffects(),
                entry.getUpdatedAt()
        );
    }
}
