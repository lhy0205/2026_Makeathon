package com.medilink.interaction.client;

public record DurContraindication(
        String itemSeqA,
        String itemSeqB,
        String medicationNameA,
        String medicationNameB,
        String reason,
        String source
) {
}
