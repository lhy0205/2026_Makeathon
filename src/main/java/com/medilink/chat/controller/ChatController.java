package com.medilink.chat.controller;

import com.medilink.chat.dto.ChatMessageResponse;
import com.medilink.chat.dto.ChatQuestionRequest;
import com.medilink.chat.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/visits/{visitId}/chat/messages")
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ChatMessageResponse askChatbot(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @Valid @RequestBody ChatQuestionRequest request
    ) {
        return chatService.askChatbot(userId, visitId, request);
    }

    @GetMapping
    public List<ChatMessageResponse> getChatHistory(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return chatService.getChatHistory(userId, visitId);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChatHistory(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        chatService.deleteChatHistory(userId, visitId);
    }
}
