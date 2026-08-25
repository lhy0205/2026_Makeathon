package com.medilink.ai.client;

import com.medilink.ai.dto.GeneratedReport;
import com.medilink.ai.dto.ReportGenerationRequest;
import com.medilink.global.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "fastapi")
public class FastApiReportAiClient implements ReportAiClient {

    private final RestClient restClient;

    public FastApiReportAiClient(
            RestClient.Builder builder,
            @Value("${ai.fastapi.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    @Override
    public GeneratedReport generateReport(ReportGenerationRequest request) {
        try {
            GeneratedReport result = restClient.post()
                    .uri("/internal/v1/reports/generate")
                    .body(request)
                    .retrieve()
                    .body(GeneratedReport.class);

            if (result == null) {
                throw new ApiException(BAD_GATEWAY, "AI 서버에서 리포트를 받지 못했습니다.");
            }

            return result;
        } catch (RestClientException exception) {
            throw new ApiException(BAD_GATEWAY, "리포트 생성 서버에 연결할 수 없습니다.");
        }
    }
}
