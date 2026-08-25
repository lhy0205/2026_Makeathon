package com.medilink.interaction.event;

import com.medilink.interaction.dto.InteractionResponse;
import com.medilink.interaction.service.InteractionService;
import com.medilink.interaction.service.InteractionWarningNotifier;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Component
@RequiredArgsConstructor
public class InteractionCheckListener {

    private final InteractionService interactionService;
    private final InteractionWarningNotifier warningNotifier;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(PrescriptionConfirmedEvent event) {
        List<InteractionResponse> interactions = interactionService.checkActiveMedications(event.userId());
        warningNotifier.notify(event.userId(), interactions);
    }
}
