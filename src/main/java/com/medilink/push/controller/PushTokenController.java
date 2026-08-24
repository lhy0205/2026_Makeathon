package com.medilink.push.controller;

import com.medilink.push.dto.PushTokenResponse;
import com.medilink.push.dto.RegisterPushTokenRequest;
import com.medilink.push.service.PushTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/push-tokens")
public class PushTokenController {

    private final PushTokenService pushTokenService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PushTokenResponse registerPushToken(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody RegisterPushTokenRequest request
    ) {
        return pushTokenService.registerPushToken(userId, request);
    }

    @DeleteMapping("/{pushTokenId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePushToken(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long pushTokenId
    ) {
        pushTokenService.deletePushToken(userId, pushTokenId);
    }
}
