package com.medilink.dose.scheduler;

import com.medilink.dose.entity.DoseStatus;
import com.medilink.dose.entity.MedicationDose;
import com.medilink.dose.repository.MedicationDoseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MissedDoseScheduler {

    private final MedicationDoseRepository medicationDoseRepository;

    @Value("${dose.missed-grace-minutes:60}")
    private long graceMinutes;

    @Scheduled(cron = "0 */5 * * * *", zone = "Asia/Seoul")
    @Transactional
    public void markPastDosesAsMissed() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(graceMinutes);
        List<MedicationDose> pastDoses = medicationDoseRepository
                .findAllByDoseStatusAndScheduledAtBefore(DoseStatus.PENDING, cutoff);

        for (MedicationDose dose : pastDoses) {
            dose.markMissed();
        }
    }
}
