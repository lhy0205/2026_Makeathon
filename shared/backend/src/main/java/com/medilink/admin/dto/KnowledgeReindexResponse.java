package com.medilink.admin.dto;

public record KnowledgeReindexResponse(
        int documentsIndexed,
        int chunksIndexed
) {
}
