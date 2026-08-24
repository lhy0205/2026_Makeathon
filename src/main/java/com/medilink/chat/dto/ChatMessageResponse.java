package com.medilink.chat.dto;

import com.medilink.chat.entity.ChatMessage;

import java.time.LocalDateTime;
import java.util.List;

public record ChatMessageResponse(
        Long id,
        String role,
        String content,
        List<String> sources,
        LocalDateTime createdAt
) {
    public static ChatMessageResponse from(ChatMessage message) {
        List<String> sourceList = (message.getSources() == null || message.getSources().isBlank())
                ? List.of()
                : List.of(message.getSources().split("\n"));
        return new ChatMessageResponse(
                message.getId(),
                message.getRole().name(),
                message.getContent(),
                sourceList,
                message.getCreatedAt()
        );
    }
}
