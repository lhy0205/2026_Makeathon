package com.medilink.chat.service;

import com.medilink.ai.client.ChatAiClient;
import com.medilink.ai.dto.ChatAnswer;
import com.medilink.ai.dto.ChatAskRequest;
import com.medilink.chat.dto.ChatMessageResponse;
import com.medilink.chat.dto.ChatQuestionRequest;
import com.medilink.chat.entity.ChatMessage;
import com.medilink.chat.entity.ChatRole;
import com.medilink.chat.repository.ChatMessageRepository;
import com.medilink.medication.entity.Medication;
import com.medilink.medication.repository.MedicationRepository;
import com.medilink.prescription.entity.Prescription;
import com.medilink.prescription.repository.PrescriptionRepository;
import com.medilink.visit.entity.Visit;
import com.medilink.visit.service.VisitService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;
    private final VisitService visitService;
    private final ChatAiClient chatAiClient;

    @Transactional
    public ChatMessageResponse askChatbot(Long userId, Long visitId, ChatQuestionRequest request) {
        Visit visit = visitService.getOwnedVisit(userId, visitId);

        chatMessageRepository.save(new ChatMessage(visit, ChatRole.USER, request.content(), null));

        List<Medication> medications = findMedicationsForVisit(visitId);

        ChatAskRequest aiRequest = new ChatAskRequest(
                visitId,
                request.content(),
                medications.stream()
                        .map(m -> new ChatAskRequest.MedicationSummary(m.getMedicationName(), formatDosage(m), m.getInstructions()))
                        .toList()
        );
        ChatAnswer answer = chatAiClient.askChatbot(aiRequest);

        String joinedSources = (answer.sources() == null || answer.sources().isEmpty())
                ? null
                : String.join("\n", answer.sources());
        ChatMessage assistantMessage = chatMessageRepository.save(
                new ChatMessage(visit, ChatRole.ASSISTANT, answer.answer(), joinedSources)
        );
        return ChatMessageResponse.from(assistantMessage);
    }

    @Transactional
    public ChatStreamSession startChatStream(Long userId, Long visitId, String content) {
        Visit visit = visitService.getOwnedVisit(userId, visitId);
        chatMessageRepository.save(new ChatMessage(visit, ChatRole.USER, content, null));

        List<Medication> medications = findMedicationsForVisit(visitId);
        ChatAskRequest aiRequest = new ChatAskRequest(
                visitId,
                content,
                medications.stream()
                        .map(medication -> new ChatAskRequest.MedicationSummary(
                                medication.getMedicationName(),
                                formatDosage(medication),
                                medication.getInstructions()
                        ))
                        .toList()
        );

        return new ChatStreamSession(visit.getId(), aiRequest);
    }

    @Transactional
    public void saveStreamedAnswer(Long userId, Long visitId, String content) {
        Visit visit = visitService.getOwnedVisit(userId, visitId);
        chatMessageRepository.save(new ChatMessage(visit, ChatRole.ASSISTANT, content, null));
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getChatHistory(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        return chatMessageRepository.findAllByVisitIdOrderByCreatedAtAsc(visitId)
                .stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    @Transactional
    public void deleteChatHistory(Long userId, Long visitId) {
        visitService.getOwnedVisit(userId, visitId);
        chatMessageRepository.deleteAllByVisitId(visitId);
    }

    private List<Medication> findMedicationsForVisit(Long visitId) {
        return prescriptionRepository.findFirstByVisitIdOrderByCreatedAtDesc(visitId)
                .map(Prescription::getId)
                .map(medicationRepository::findAllByPrescriptionIdOrderById)
                .orElse(List.of());
    }

    private String formatDosage(Medication medication) {
        if (medication.getDosage() == null) {
            return null;
        }
        return medication.getDoseUnit() == null
                ? medication.getDosage().toString()
                : medication.getDosage() + " " + medication.getDoseUnit();
    }

    public record ChatStreamSession(Long visitId, ChatAskRequest aiRequest) {
    }
}
