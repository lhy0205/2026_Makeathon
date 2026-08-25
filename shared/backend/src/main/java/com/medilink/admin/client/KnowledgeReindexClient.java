package com.medilink.admin.client;

import com.medilink.admin.dto.KnowledgeReindexResponse;
import com.medilink.global.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

import java.util.List;

@Component
public class KnowledgeReindexClient {

    private final RestClient restClient;

    public KnowledgeReindexClient(
            RestClient.Builder builder,
            @Value("${ai.fastapi.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public KnowledgeReindexResponse reindex(List<KnowledgeEntryPayload> entries) {
        try {
            KnowledgeReindexResponse response = restClient.post()
                    .uri("/internal/v1/knowledge/reindex")
                    .body(new KnowledgeReindexRequest(entries))
                    .retrieve()
                    .body(KnowledgeReindexResponse.class);

            if (response == null) {
                throw new ApiException(BAD_GATEWAY, "AI 서버에서 재색인 결과를 받지 못했습니다.");
            }

            return response;
        } catch (RestClientException exception) {
            throw new ApiException(BAD_GATEWAY, "AI 서버의 지식베이스를 재색인하지 못했습니다.");
        }
    }

    public record KnowledgeReindexRequest(List<KnowledgeEntryPayload> entries) {
    }

    public record KnowledgeEntryPayload(
            String itemSeq,
            String medicationName,
            String purpose,
            String sideEffects
    ) {
    }
}
