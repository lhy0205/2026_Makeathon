package com.medilink;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:medilink;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "ai.provider=mock",
        "dur.enabled=false",
        "jwt.secret=medilink-integration-test-secret-key-at-least-thirty-two-characters",
        "storage.prescriptions-directory=build/test-prescriptions"
})
@AutoConfigureMockMvc
@Transactional
class BackendFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerLoginAndRefreshTokenRotationWork() throws Exception {
        JsonNode registered = register("auth-flow@medilink.test");
        String accessToken = registered.get("accessToken").asText();
        String refreshToken = registered.get("refreshToken").asText();

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("auth-flow@medilink.test"))
                .andExpect(jsonPath("$.role").value("USER"));

        mockMvc.perform(get("/api/v1/admin/dashboard")
                        .header("Authorization", bearer(accessToken)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", "auth-flow@medilink.test",
                                "password", "password123"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());

        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", refreshToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        String rotatedToken = body(refreshResult).get("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", refreshToken))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", rotatedToken))))
                .andExpect(status().isOk());
    }

    @Test
    void prescriptionScanConfirmationImageAndCorrectionWork() throws Exception {
        String accessToken = register("prescription-flow@medilink.test").get("accessToken").asText();
        long visitId = createVisit(accessToken);
        MockMultipartFile image = new MockMultipartFile(
                "image",
                "prescription.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "test-image".getBytes()
        );

        MvcResult scanResult = mockMvc.perform(multipart("/api/v1/visits/{visitId}/prescriptions/scan", visitId)
                        .file(image)
                        .header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.medications[0].itemSeq").value("199900001"))
                .andExpect(jsonPath("$.imageUrl").isNotEmpty())
                .andReturn();

        JsonNode scan = body(scanResult);
        MvcResult confirmationResult = mockMvc.perform(post(
                                "/api/v1/visits/{visitId}/prescriptions",
                                visitId
                        )
                        .header("Authorization", bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "imageUrl", scan.get("imageUrl").asText(),
                                "rawOcrText", scan.get("rawOcrText").asText(),
                                "medications", scan.get("medications")
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.imageUrl").isNotEmpty())
                .andExpect(jsonPath("$.medications[0].itemSeq").value("199900001"))
                .andReturn();

        long prescriptionId = body(confirmationResult).get("id").asLong();

        mockMvc.perform(get("/api/v1/prescriptions/{prescriptionId}/image", prescriptionId)
                        .header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(content().bytes("test-image".getBytes()));

        mockMvc.perform(post("/api/v1/prescriptions/{prescriptionId}/corrections", prescriptionId)
                        .header("Authorization", bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "ocrText", "예시얏",
                                "correctedName", "예시약",
                                "itemSeq", "199900001"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.correctedName").value("예시약"));

        mockMvc.perform(post("/api/v1/interactions/check")
                        .header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void chatbotStreamSendsSseAndStoresCompletedAnswer() throws Exception {
        String accessToken = register("chat-flow@medilink.test").get("accessToken").asText();
        long visitId = createVisit(accessToken);
        MvcResult streamResult = mockMvc.perform(get("/api/v1/visits/{visitId}/chat/stream", visitId)
                        .header("Authorization", bearer(accessToken))
                        .param("content", "이 약은 언제 먹나요?")
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(streamResult))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("event:message")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("[DONE]")));

        mockMvc.perform(get("/api/v1/visits/{visitId}/chat/messages", visitId)
                        .header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].role").value("ASSISTANT"));
    }

    @Test
    void doseBatchUpdateIsIdempotentAndUpdatesAdherence() throws Exception {
        String accessToken = register("dose-flow@medilink.test").get("accessToken").asText();
        long visitId = createVisit(accessToken);
        long medicationId = confirmPrescription(accessToken, visitId);
        LocalDate date = LocalDate.now().plusDays(1);

        MvcResult createResult = mockMvc.perform(post("/api/v1/medications/{medicationId}/doses", medicationId)
                        .header("Authorization", bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "startDate", date.toString(),
                                "endDate", date.toString(),
                                "times", new String[]{"08:00:00", "20:00:00"}
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(2))
                .andReturn();

        JsonNode doses = body(createResult);
        long firstDoseId = doses.get(0).get("id").asLong();
        long secondDoseId = doses.get(1).get("id").asLong();
        String takenAt = LocalDateTime.of(date, java.time.LocalTime.of(8, 5)).toString();
        String batchBody = json(new Object[]{
                Map.of("doseId", firstDoseId, "status", "TAKEN", "takenAt", takenAt),
                Map.of("doseId", secondDoseId, "status", "SKIPPED")
        });

        for (int requestCount = 0; requestCount < 2; requestCount++) {
            mockMvc.perform(put("/api/v1/doses/batch")
                            .header("Authorization", bearer(accessToken))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(batchBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].doseStatus").value("TAKEN"))
                    .andExpect(jsonPath("$[1].doseStatus").value("SKIPPED"));
        }

        mockMvc.perform(get("/api/v1/visits/{visitId}/visualizations/summary", visitId)
                        .header("Authorization", bearer(accessToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.adherenceRate").value(50.0));
    }

    private JsonNode register(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "email", email,
                                "password", "password123",
                                "nickname", "테스터"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        return body(result);
    }

    private long createVisit(String accessToken) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/visits")
                        .header("Authorization", bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "hospitalName", "테스트병원",
                                "departmentName", "내과",
                                "visitedAt", LocalDate.now().toString(),
                                "visitReason", "감기",
                                "medicationStartDate", LocalDate.now().toString(),
                                "medicationEndDate", LocalDate.now().plusDays(6).toString()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        return body(result).get("id").asLong();
    }

    private long confirmPrescription(String accessToken, long visitId) throws Exception {
        Map<String, Object> medication = Map.ofEntries(
                Map.entry("medicationName", "예시약"),
                Map.entry("itemSeq", "199900001"),
                Map.entry("dosage", 1),
                Map.entry("doseUnit", "정"),
                Map.entry("frequencyPerDay", 2),
                Map.entry("durationDays", 7),
                Map.entry("instructions", "식후 30분"),
                Map.entry("purpose", "증상 완화"),
                Map.entry("sideEffectSummary", "주의"),
                Map.entry("confidence", 0.95),
                Map.entry("unmatched", false)
        );
        MvcResult result = mockMvc.perform(post("/api/v1/visits/{visitId}/prescriptions", visitId)
                        .header("Authorization", bearer(accessToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "rawOcrText", "테스트 OCR",
                                "medications", new Object[]{medication}
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        return body(result).get("medications").get(0).get("id").asLong();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
