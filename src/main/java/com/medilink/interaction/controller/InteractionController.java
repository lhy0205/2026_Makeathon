package com.medilink.interaction.controller;

import com.medilink.interaction.dto.InteractionResponse;
import com.medilink.interaction.service.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/interactions")
public class InteractionController {

    private final InteractionService interactionService;

    @PostMapping("/check")
    public List<InteractionResponse> check(@AuthenticationPrincipal Long userId) {
        return interactionService.checkActiveMedications(userId);
    }

    @GetMapping("/active")
    public List<InteractionResponse> getActive(@AuthenticationPrincipal Long userId) {
        return interactionService.getActiveInteractions(userId);
    }
}
