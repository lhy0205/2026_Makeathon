package com.medilink.push.service;

import com.medilink.dose.entity.DoseStatus;
import com.medilink.dose.entity.MedicationDose;
import com.medilink.dose.repository.MedicationDoseRepository;
import com.medilink.push.entity.PushToken;
import com.medilink.push.repository.PushTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MedicationReminderScheduler {

    private final MedicationDoseRepository medicationDoseRepository;
    private final PushTokenRepository pushTokenRepository;
    private final ExpoPushService expoPushService;

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Seoul")
    @Transactional
    public void sendMedicationReminder() {
        LocalDateTime start = LocalDateTime.now().truncatedTo(ChronoUnit.MINUTES);
        LocalDateTime end = start.plusMinutes(1);

        List<MedicationDose> doses = medicationDoseRepository
                .findAllByDoseStatusAndReminderSentAtIsNullAndScheduledAtBetween(
                        DoseStatus.PENDING,
                        start,
                        end
                );

        for (MedicationDose dose : doses) {
            sendDoseReminder(dose);
        }
    }

    private void sendDoseReminder(MedicationDose dose) {
        Long userId = dose.getMedication()
                .getPrescription()
                .getVisit()
                .getUser()
                .getId();

        List<PushToken> pushTokens = pushTokenRepository.findAllByUserId(userId);
        boolean sent = false;

        for (PushToken pushToken : pushTokens) {
            boolean tokenSent = sendPushToken(pushToken, dose);

            if (tokenSent) {
                sent = true;
            }
        }

        if (sent) {
            dose.markReminderSent(LocalDateTime.now());
        }
    }

    private boolean sendPushToken(PushToken pushToken, MedicationDose dose) {
        try {
            expoPushService.send(pushToken.getToken(), dose.getMedication().getMedicationName());
            return true;
        } catch (RestClientException exception) {
            return false;
        }
    }
}
