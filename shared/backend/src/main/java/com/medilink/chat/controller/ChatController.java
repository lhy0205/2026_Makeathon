package com.medilink.chat.controller;

import com.medilink.chat.dto.ChatMessageResponse;
import com.medilink.chat.dto.ChatQuestionRequest;
import com.medilink.chat.service.ChatService;
import com.medilink.ai.client.ChatAiClient;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/visits/{visitId}/chat")
public class ChatController {

    private final ChatService chatService;
    private final ChatAiClient chatAiClient;

    @PostMapping("/messages")
    public ChatMessageResponse askChatbot(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @Valid @RequestBody ChatQuestionRequest request
    ) {
        return chatService.askChatbot(userId, visitId, request);
    }

    @GetMapping("/messages")
    public List<ChatMessageResponse> getChatHistory(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        return chatService.getChatHistory(userId, visitId);
    }

    @DeleteMapping("/messages")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChatHistory(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId
    ) {
        chatService.deleteChatHistory(userId, visitId);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChatbot(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long visitId,
            @NotBlank(message = "질문을 입력해 주세요.") @RequestParam String content
    ) {
        ChatService.ChatStreamSession session = chatService.startChatStream(userId, visitId, content);
        SseEmitter emitter = new SseEmitter(120_000L);
        StringBuilder completedAnswer = new StringBuilder();

        chatAiClient.streamChatbot(session.aiRequest())
                .subscribe(
                        chunk -> sendChunk(emitter, completedAnswer, chunk),
                        emitter::completeWithError,
                        () -> completeStream(emitter, userId, session.visitId(), completedAnswer.toString())
                );

        return emitter;
    }

    private void sendChunk(SseEmitter emitter, StringBuilder answer, String chunk) {
        try {
            answer.append(chunk);
            emitter.send(SseEmitter.event().name("message").data(chunk));
        } catch (Exception exception) {
            emitter.completeWithError(exception);
        }
    }

    private void completeStream(SseEmitter emitter, Long userId, Long visitId, String answer) {
        chatService.saveStreamedAnswer(userId, visitId, answer);
        try {
            emitter.send(SseEmitter.event().name("done").data("[DONE]"));
            emitter.complete();
        } catch (Exception exception) {
            emitter.completeWithError(exception);
        }
    }
}
