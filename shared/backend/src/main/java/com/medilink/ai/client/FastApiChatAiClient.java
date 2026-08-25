package com.medilink.ai.client;

import com.medilink.ai.dto.ChatAnswer;
import com.medilink.ai.dto.ChatAskRequest;
import com.medilink.global.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "fastapi")
public class FastApiChatAiClient implements ChatAiClient {

    private final RestClient restClient;
    private final WebClient webClient;

    public FastApiChatAiClient(
            RestClient.Builder builder,
            WebClient.Builder webClientBuilder,
            @Value("${ai.fastapi.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
    }

    @Override
    public ChatAnswer askChatbot(ChatAskRequest request) {
        try {
            ChatAnswer result = restClient.post()
                    .uri("/internal/v1/chat")
                    .body(request)
                    .retrieve()
                    .body(ChatAnswer.class);

            if (result == null) {
                throw new ApiException(BAD_GATEWAY, "AI 서버에서 답변을 받지 못했습니다.");
            }

            return result;
        } catch (RestClientException exception) {
            throw new ApiException(BAD_GATEWAY, "챗봇 서버에 연결할 수 없습니다.");
        }
    }

    @Override
    public Flux<String> streamChatbot(ChatAskRequest request) {
        return webClient.post()
                .uri("/internal/v1/chat/stream")
                .bodyValue(request)
                .retrieve()
                .bodyToFlux(String.class)
                .onErrorMap(exception -> new ApiException(BAD_GATEWAY, "챗봇 스트리밍 서버에 연결할 수 없습니다."));
    }
}
