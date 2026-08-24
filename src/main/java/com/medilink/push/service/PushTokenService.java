package com.medilink.push.service;

import com.medilink.global.exception.ApiException;
import com.medilink.push.dto.PushTokenResponse;
import com.medilink.push.dto.RegisterPushTokenRequest;
import com.medilink.push.entity.PushToken;
import com.medilink.push.repository.PushTokenRepository;
import com.medilink.user.entity.User;
import com.medilink.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PushTokenService {

    private final PushTokenRepository pushTokenRepository;
    private final UserService userService;

    @Transactional
    public PushTokenResponse registerPushToken(Long userId, RegisterPushTokenRequest request) {
        PushToken existingToken = pushTokenRepository.findByToken(request.token()).orElse(null);

        if (existingToken != null) {
            if (!existingToken.getUser().getId().equals(userId)) {
                throw new ApiException(HttpStatus.CONFLICT, "다른 사용자에게 등록된 알림 토큰입니다.");
            }

            return PushTokenResponse.from(existingToken);
        }

        User user = userService.getUser(userId);
        PushToken pushToken = new PushToken(user, request.token());
        PushToken savedToken = pushTokenRepository.save(pushToken);

        return PushTokenResponse.from(savedToken);
    }

    @Transactional
    public void deletePushToken(Long userId, Long pushTokenId) {
        PushToken pushToken = pushTokenRepository.findByIdAndUserId(pushTokenId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "알림 토큰을 찾을 수 없습니다."));

        pushTokenRepository.delete(pushToken);
    }
}
