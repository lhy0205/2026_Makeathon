package com.medilink.user.controller;

import com.medilink.user.dto.UpdateProfileRequest;
import com.medilink.user.dto.UserResponse;
import com.medilink.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserResponse getMyProfile(@AuthenticationPrincipal Long userId) {
        return userService.getMyProfile(userId);
    }

    @PutMapping("/me")
    public UserResponse updateMyProfile(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        return userService.updateMyProfile(userId, request);
    }
}
