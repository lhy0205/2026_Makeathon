package com.medilink.ai.client;

import com.medilink.ai.dto.PrescriptionAnalysisResult;
import com.medilink.global.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "fastapi")
public class FastApiAiClient implements AiClient {

    private final RestClient restClient;

    public FastApiAiClient(
            RestClient.Builder builder,
            @Value("${ai.fastapi.base-url}") String baseUrl
    ) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    @Override
    public PrescriptionAnalysisResult analyzePrescription(MultipartFile image) {
        try {
            ByteArrayResource imageResource = createImageResource(image);
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", imageResource);

            PrescriptionAnalysisResult result = restClient.post()
                    .uri("/internal/v1/prescriptions/analyze")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(PrescriptionAnalysisResult.class);

            if (result == null) {
                throw new ApiException(BAD_GATEWAY, "AI 서버에서 분석 결과를 받지 못했습니다.");
            }

            return result;
        } catch (IOException | RestClientException exception) {
            throw new ApiException(BAD_GATEWAY, "처방전 분석 서버에 연결할 수 없습니다.");
        }
    }

    private ByteArrayResource createImageResource(MultipartFile image) throws IOException {
        return new ByteArrayResource(image.getBytes()) {
            @Override
            public String getFilename() {
                return image.getOriginalFilename();
            }
        };
    }
}
