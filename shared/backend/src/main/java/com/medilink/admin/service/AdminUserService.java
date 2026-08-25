package com.medilink.admin.service;

import com.medilink.admin.dto.AdminUserDetailResponse;
import com.medilink.admin.dto.AdminUserSummaryResponse;
import com.medilink.chat.entity.ChatMessage;
import com.medilink.chat.repository.ChatMessageRepository;
import com.medilink.dose.entity.DoseStatus;
import com.medilink.dose.entity.MedicationDose;
import com.medilink.dose.repository.MedicationDoseRepository;
import com.medilink.global.exception.ApiException;
import com.medilink.healthlog.entity.HealthLog;
import com.medilink.healthlog.repository.HealthLogRepository;
import com.medilink.interaction.entity.MedicationInteraction;
import com.medilink.interaction.repository.MedicationInteractionRepository;
import com.medilink.medication.entity.Medication;
import com.medilink.medication.repository.MedicationRepository;
import com.medilink.prescription.entity.Prescription;
import com.medilink.prescription.repository.PrescriptionRepository;
import com.medilink.report.entity.Report;
import com.medilink.report.repository.ReportRepository;
import com.medilink.user.entity.User;
import com.medilink.user.repository.UserRepository;
import com.medilink.visit.entity.Visit;
import com.medilink.visit.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 관리자 화면이 보는 '사용자 활동'.
 *
 * 목록은 사용자마다 여러 테이블을 훑어야 해서 한 번에 다 읽고 메모리에서 묶는다.
 * 지금 규모에서는 이게 가장 단순하고 충분히 빠르다.
 * 사용자가 수천 명이 되면 집계 쿼리로 옮겨야 한다.
 */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    /** 상세 화면 타임라인에 보여줄 최근 활동 수 */
    private static final int RECENT_ACTIVITY_LIMIT = 40;

    private final UserRepository userRepository;
    private final VisitRepository visitRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicationRepository medicationRepository;
    private final MedicationDoseRepository medicationDoseRepository;
    private final HealthLogRepository healthLogRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ReportRepository reportRepository;
    private final MedicationInteractionRepository interactionRepository;

    @Transactional(readOnly = true)
    public List<AdminUserSummaryResponse> getUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::toSummary)
                .sorted(Comparator.comparing(
                        AdminUserSummaryResponse::lastActiveAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminUserDetailResponse getUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        List<Visit> visits = visitRepository.findAllByUserIdOrderByVisitedAtDesc(userId);
        List<MedicationDose> doses = medicationDoseRepository
                .findAllByMedicationPrescriptionVisitUserId(userId);
        List<HealthLog> healthLogs = healthLogRepository
                .findAllByVisitUserIdOrderByRecordedAtDesc(userId);
        List<ChatMessage> chatMessages = chatMessageRepository
                .findAllByVisitUserIdOrderByCreatedAtDesc(userId);
        List<Report> reports = reportRepository.findAllByVisitUserIdOrderByGeneratedAtDesc(userId);
        List<MedicationInteraction> interactions = interactionRepository
                .findAllByUserIdOrderByCheckedAtDesc(userId);

        List<AdminUserDetailResponse.Visit> visitViews = visits.stream()
                .map(visit -> toVisitView(visit, doses, healthLogs))
                .toList();

        return new AdminUserDetailResponse(
                toSummary(user),
                visitViews,
                buildTimeline(doses, healthLogs, chatMessages, reports, interactions)
        );
    }

    // ── 요약 ─────────────────────────────────────

    private AdminUserSummaryResponse toSummary(User user) {
        Long userId = user.getId();

        List<Visit> visits = visitRepository.findAllByUserIdOrderByVisitedAtDesc(userId);
        List<MedicationDose> doses = medicationDoseRepository
                .findAllByMedicationPrescriptionVisitUserId(userId);
        List<HealthLog> healthLogs = healthLogRepository
                .findAllByVisitUserIdOrderByRecordedAtDesc(userId);
        List<ChatMessage> chatMessages = chatMessageRepository
                .findAllByVisitUserIdOrderByCreatedAtDesc(userId);
        List<Report> reports = reportRepository.findAllByVisitUserIdOrderByGeneratedAtDesc(userId);

        long medicationCount = visits.stream()
                .map(visit -> medicationsOf(visit.getId()).size())
                .mapToLong(Integer::longValue)
                .sum();

        long recorded = doses.stream()
                .filter(dose -> dose.getDoseStatus() != DoseStatus.PENDING)
                .count();
        long taken = countByStatus(doses, DoseStatus.TAKEN);

        return AdminUserSummaryResponse.of(
                user,
                visits.size(),
                medicationCount,
                doses.size(),
                taken,
                percentage(taken, recorded),
                healthLogs.size(),
                chatMessages.size(),
                reports.size(),
                interactionRepository.findAllByUserIdOrderByCheckedAtDesc(userId).size(),
                lastActiveAt(doses, healthLogs, chatMessages, reports)
        );
    }

    /**
     * 마지막 활동 시각.
     * 복용은 실제로 누른 시각(takenAt)만 활동으로 본다 — 일정이 잡힌 것만으로는 쓴 게 아니다.
     */
    private LocalDateTime lastActiveAt(
            List<MedicationDose> doses,
            List<HealthLog> healthLogs,
            List<ChatMessage> chatMessages,
            List<Report> reports
    ) {
        return java.util.stream.Stream.of(
                        doses.stream().map(MedicationDose::getTakenAt),
                        healthLogs.stream().map(HealthLog::getCreatedAt),
                        chatMessages.stream().map(ChatMessage::getCreatedAt),
                        reports.stream().map(Report::getGeneratedAt)
                )
                .flatMap(stream -> stream)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }

    // ── 치료별 ───────────────────────────────────

    private AdminUserDetailResponse.Visit toVisitView(
            Visit visit,
            List<MedicationDose> allDoses,
            List<HealthLog> allHealthLogs
    ) {
        Long visitId = visit.getId();
        List<Medication> medications = medicationsOf(visitId);

        Map<Long, Boolean> ownedMedications = medications.stream()
                .collect(Collectors.toMap(Medication::getId, medication -> true));

        List<MedicationDose> doses = allDoses.stream()
                .filter(dose -> ownedMedications.containsKey(dose.getMedication().getId()))
                .toList();

        long healthLogCount = allHealthLogs.stream()
                .filter(log -> log.getVisit().getId().equals(visitId))
                .count();

        return new AdminUserDetailResponse.Visit(
                visitId,
                visit.getHospitalName(),
                visit.getDepartmentName(),
                visit.getVisitReason(),
                visit.getTreatmentStatus().name(),
                visit.getVisitedAt(),
                visit.getMedicationStartDate(),
                visit.getMedicationEndDate(),
                medications.stream().map(Medication::getMedicationName).toList(),
                medications.stream().filter(Medication::isOcrUnmatched).count(),
                doses.size(),
                countByStatus(doses, DoseStatus.TAKEN),
                countByStatus(doses, DoseStatus.SKIPPED),
                countByStatus(doses, DoseStatus.MISSED),
                healthLogCount,
                chatMessageRepository.countByVisitId(visitId),
                reportRepository.countByVisitId(visitId)
        );
    }

    // ── 타임라인 ─────────────────────────────────

    private List<AdminUserDetailResponse.Activity> buildTimeline(
            List<MedicationDose> doses,
            List<HealthLog> healthLogs,
            List<ChatMessage> chatMessages,
            List<Report> reports,
            List<MedicationInteraction> interactions
    ) {
        List<AdminUserDetailResponse.Activity> items = new ArrayList<>();

        for (MedicationDose dose : doses) {
            // 아직 안 누른 일정은 활동이 아니다
            if (dose.getTakenAt() == null) {
                continue;
            }
            items.add(new AdminUserDetailResponse.Activity(
                    "DOSE",
                    dose.getMedication().getMedicationName() + " 복용 체크",
                    dose.getTakenAt()
            ));
        }

        for (HealthLog log : healthLogs) {
            items.add(new AdminUserDetailResponse.Activity(
                    "HEALTH_LOG",
                    "상태 기록",
                    log.getCreatedAt()
            ));
        }

        for (ChatMessage message : chatMessages) {
            items.add(new AdminUserDetailResponse.Activity(
                    "CHAT",
                    // 대화 내용은 담지 않는다. 관리자가 볼 이유가 없다
                    "챗봇 " + (message.getRole().name().equals("USER") ? "질문" : "답변"),
                    message.getCreatedAt()
            ));
        }

        for (Report report : reports) {
            items.add(new AdminUserDetailResponse.Activity(
                    "REPORT",
                    "진료 리포트 생성",
                    report.getGeneratedAt()
            ));
        }

        for (MedicationInteraction interaction : interactions) {
            items.add(new AdminUserDetailResponse.Activity(
                    "INTERACTION",
                    "상호작용 경고: "
                            + interaction.getMedicationA().getMedicationName()
                            + " + "
                            + interaction.getMedicationB().getMedicationName(),
                    interaction.getCheckedAt()
            ));
        }

        return items.stream()
                .sorted(Comparator.comparing(
                        AdminUserDetailResponse.Activity::at,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .limit(RECENT_ACTIVITY_LIMIT)
                .toList();
    }

    // ── 공통 ─────────────────────────────────────

    private List<Medication> medicationsOf(Long visitId) {
        return prescriptionRepository.findFirstByVisitIdOrderByCreatedAtDesc(visitId)
                .map(Prescription::getId)
                .map(medicationRepository::findAllByPrescriptionIdOrderById)
                .orElse(List.of());
    }

    private long countByStatus(List<MedicationDose> doses, DoseStatus status) {
        return doses.stream().filter(dose -> dose.getDoseStatus() == status).count();
    }

    private double percentage(long numerator, long denominator) {
        if (denominator == 0) {
            return 0.0;
        }
        return Math.round(numerator * 1000.0 / denominator) / 10.0;
    }
}
