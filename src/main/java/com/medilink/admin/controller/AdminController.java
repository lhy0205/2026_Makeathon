package com.medilink.admin.controller;

import com.medilink.admin.dto.AdminDashboardResponse;
import com.medilink.admin.dto.KnowledgeEntryRequest;
import com.medilink.admin.dto.KnowledgeEntryResponse;
import com.medilink.admin.dto.KnowledgeReindexResponse;
import com.medilink.admin.dto.OcrFailureResponse;
import com.medilink.admin.service.AdminService;
import com.medilink.user.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public AdminDashboardResponse getDashboard() {
        return adminService.getDashboard();
    }

    @GetMapping("/users")
    public List<UserResponse> getUsers() {
        return adminService.getUsers();
    }

    @GetMapping("/ocr-failures")
    public List<OcrFailureResponse> getOcrFailures() {
        return adminService.getOcrFailures();
    }

    @GetMapping("/knowledge")
    public List<KnowledgeEntryResponse> getKnowledgeEntries() {
        return adminService.getKnowledgeEntries();
    }

    @PostMapping("/knowledge")
    @ResponseStatus(HttpStatus.CREATED)
    public KnowledgeEntryResponse createKnowledgeEntry(
            @Valid @RequestBody KnowledgeEntryRequest request
    ) {
        return adminService.createKnowledgeEntry(request);
    }

    @PutMapping("/knowledge/{knowledgeId}")
    public KnowledgeEntryResponse updateKnowledgeEntry(
            @PathVariable Long knowledgeId,
            @Valid @RequestBody KnowledgeEntryRequest request
    ) {
        return adminService.updateKnowledgeEntry(knowledgeId, request);
    }

    @DeleteMapping("/knowledge/{knowledgeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteKnowledgeEntry(@PathVariable Long knowledgeId) {
        adminService.deleteKnowledgeEntry(knowledgeId);
    }

    @PostMapping("/knowledge/reindex")
    public KnowledgeReindexResponse reindexKnowledge() {
        return adminService.reindexKnowledge();
    }
}
