package com.medilink.push.dto;

import com.medilink.push.entity.PushToken;

public record PushTokenResponse(
        Long id,
        String token
) {

    public static PushTokenResponse from(PushToken pushToken) {
        return new PushTokenResponse(pushToken.getId(), pushToken.getToken());
    }
}
