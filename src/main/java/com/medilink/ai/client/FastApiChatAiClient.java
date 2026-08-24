package com.medilink.ai.client;

import com.medilink.ai.dto.ChatAnswer;
import com.medilink.ai.dto.ChatAskRequest;
import com.medilink.global.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "fastapi")
public class FastApiChatAiClient implements ChatAiClient {

    private final RestClient restClient;

    public FastApiChatAiClient(
            RestClient.Builder builder,
            @Value("${ai.fastapi.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
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
}
