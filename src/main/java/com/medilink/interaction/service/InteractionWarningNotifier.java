package com.medilink.interaction.service;

import com.medilink.interaction.dto.InteractionResponse;
import com.medilink.push.entity.PushToken;
import com.medilink.push.repository.PushTokenRepository;
import com.medilink.push.service.ExpoPushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class InteractionWarningNotifier {

    private final PushTokenRepository pushTokenRepository;
    private final ExpoPushService expoPushService;

    public void notify(Long userId, List<InteractionResponse> interactions) {
        if (interactions.isEmpty()) {
            return;
        }

        InteractionResponse first = interactions.get(0);
        String body = first.medicationAName() + "과(와) " + first.medicationBName()
                + "의 병용금기 가능성을 확인해 주세요.";

        for (PushToken pushToken : pushTokenRepository.findAllByUserId(userId)) {
            send(pushToken, body, interactions.size());
        }
    }

    private void send(PushToken pushToken, String body, int count) {
        try {
            expoPushService.sendMessage(
                    pushToken.getToken(),
                    "약물 상호작용 경고",
                    body,
                    Map.of("type", "MEDICATION_INTERACTION", "count", count)
            );
        } catch (RestClientException exception) {
            log.warn("상호작용 경고 푸시 전송에 실패했습니다. pushTokenId={}", pushToken.getId());
        }
    }
}
