package com.medilink.interaction.dto;

import com.medilink.interaction.entity.InteractionSeverity;
import com.medilink.interaction.entity.InteractionType;
import com.medilink.interaction.entity.MedicationInteraction;

import java.time.LocalDateTime;

public record InteractionResponse(
        Long id,
        Long medicationAId,
        String medicationAName,
        String medicationAItemSeq,
        Long medicationBId,
        String medicationBName,
        String medicationBItemSeq,
        InteractionType type,
        InteractionSeverity severity,
        String reason,
        String source,
        LocalDateTime checkedAt
) {

    public static InteractionResponse from(MedicationInteraction interaction) {
        return new InteractionResponse(
                interaction.getId(),
                interaction.getMedicationA().getId(),
                interaction.getMedicationA().getMedicationName(),
                interaction.getMedicationA().getItemSeq(),
                interaction.getMedicationB().getId(),
                interaction.getMedicationB().getMedicationName(),
                interaction.getMedicationB().getItemSeq(),
                interaction.getType(),
                interaction.getSeverity(),
                interaction.getReason(),
                interaction.getSource(),
                interaction.getCheckedAt()
        );
    }
}
