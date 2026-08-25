package com.medilink.interaction.service;

import com.medilink.interaction.client.DurClient;
import com.medilink.interaction.client.DurContraindication;
import com.medilink.interaction.dto.InteractionResponse;
import com.medilink.interaction.entity.InteractionSeverity;
import com.medilink.interaction.entity.InteractionType;
import com.medilink.interaction.entity.MedicationInteraction;
import com.medilink.interaction.repository.MedicationInteractionRepository;
import com.medilink.medication.entity.Medication;
import com.medilink.medication.repository.MedicationRepository;
import com.medilink.visit.entity.TreatmentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InteractionService {

    private final DurClient durClient;
    private final MedicationRepository medicationRepository;
    private final MedicationInteractionRepository interactionRepository;

    @Transactional
    public List<InteractionResponse> checkActiveMedications(Long userId) {
        List<Medication> medications = medicationRepository
                .findAllByPrescriptionVisitUserIdAndPrescriptionVisitTreatmentStatusNotOrderById(
                        userId,
                        TreatmentStatus.COMPLETED
                );

        interactionRepository.deleteAllByUserId(userId);
        List<MedicationInteraction> interactions = new ArrayList<>();

        for (int firstIndex = 0; firstIndex < medications.size(); firstIndex++) {
            Medication first = medications.get(firstIndex);

            for (int secondIndex = firstIndex + 1; secondIndex < medications.size(); secondIndex++) {
                Medication second = medications.get(secondIndex);
                findInteraction(userId, first, second).ifPresent(interactions::add);
            }
        }

        return interactionRepository.saveAll(interactions)
                .stream()
                .map(InteractionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InteractionResponse> getActiveInteractions(Long userId) {
        return interactionRepository.findAllByUserIdOrderByCheckedAtDesc(userId)
                .stream()
                .filter(this::isActive)
                .map(InteractionResponse::from)
                .toList();
    }

    private Optional<MedicationInteraction> findInteraction(
            Long userId,
            Medication first,
            Medication second
    ) {
        return durClient.findContraindication(first.getItemSeq(), second.getItemSeq())
                .map(result -> createInteraction(userId, first, second, result));
    }

    private MedicationInteraction createInteraction(
            Long userId,
            Medication first,
            Medication second,
            DurContraindication result
    ) {
        return new MedicationInteraction(
                userId,
                first,
                second,
                InteractionType.DUR_CONTRAINDICATION,
                InteractionSeverity.CONTRAINDICATED,
                result.reason(),
                result.source()
        );
    }

    private boolean isActive(MedicationInteraction interaction) {
        TreatmentStatus firstStatus = interaction.getMedicationA()
                .getPrescription()
                .getVisit()
                .getTreatmentStatus();
        TreatmentStatus secondStatus = interaction.getMedicationB()
                .getPrescription()
                .getVisit()
                .getTreatmentStatus();

        return firstStatus != TreatmentStatus.COMPLETED
                && secondStatus != TreatmentStatus.COMPLETED;
    }
}
