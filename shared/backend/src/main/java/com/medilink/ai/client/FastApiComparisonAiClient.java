package com.medilink.ai.client;

import com.medilink.ai.dto.TreatmentComparisonRequest;
import com.medilink.ai.dto.TreatmentComparisonResult;
import com.medilink.global.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "fastapi")
public class FastApiComparisonAiClient implements ComparisonAiClient {

    private final RestClient restClient;

    public FastApiComparisonAiClient(
            RestClient.Builder builder,
            @Value("${ai.fastapi.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    @Override
    public TreatmentComparisonResult compareTreatments(TreatmentComparisonRequest request) {
        try {
            TreatmentComparisonResult result = restClient.post()
                    .uri("/internal/v1/treatments/compare")
                    .body(request)
                    .retrieve()
                    .body(TreatmentComparisonResult.class);

            if (result == null) {
                throw new ApiException(BAD_GATEWAY, "AI 서버에서 비교 결과를 받지 못했습니다.");
            }

            return result;
        } catch (RestClientException exception) {
            throw new ApiException(BAD_GATEWAY, "치료 비교 서버에 연결할 수 없습니다.");
        }
    }
}
