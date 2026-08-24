package com.medilink.push.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ExpoPushService {

    private final RestClient restClient;

    public ExpoPushService(
            RestClient.Builder builder,
            @Value("${expo.push-url:https://exp.host/--/api/v2/push/send}") String pushUrl
    ) {
        this.restClient = builder.baseUrl(pushUrl).build();
    }

    public void send(String token, String medicationName) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("to", token);
        body.put("title", "복약 시간입니다");
        body.put("body", medicationName + " 복용 시간을 확인해 주세요.");
        body.put("sound", "default");

        restClient.post()
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }
}
