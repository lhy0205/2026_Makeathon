package com.medilink.chat.dto;

import com.medilink.chat.entity.ChatMessage;
import com.medilink.chat.entity.ChatRole;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public record ChatMessageResponse(
        Long id,
        String role,
        String content,
        List<SourceResponse> sources,
        String disclaimer,
        LocalDateTime createdAt
) {
    private static final String MEDICAL_DISCLAIMER =
            "이 답변은 참고용이며 진단이나 처방을 대신하지 않습니다.";

    public static ChatMessageResponse from(ChatMessage message) {
        List<SourceResponse> sourceList = parseSources(message.getSources());
        String disclaimer = message.getRole() == ChatRole.ASSISTANT
                ? MEDICAL_DISCLAIMER
                : null;

        return new ChatMessageResponse(
                message.getId(),
                message.getRole().name(),
                message.getContent(),
                sourceList,
                disclaimer,
                message.getCreatedAt()
        );
    }

    private static List<SourceResponse> parseSources(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        List<SourceResponse> sources = new ArrayList<>();
        String[] values = value.split("\\n");

        for (String item : values) {
            if (!item.isBlank()) {
                sources.add(new SourceResponse(item.trim(), null));
            }
        }

        return sources;
    }
}
