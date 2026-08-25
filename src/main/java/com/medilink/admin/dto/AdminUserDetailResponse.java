package com.medilink.admin.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 사용자 한 명이 앱에서 무엇을 했는지 보여준다.
 *
 * 건강 기록의 내용 자체(증상, 메모)는 담지 않는다.
 * 운영에 필요한 건 '얼마나 쓰고 있는가'지 '무슨 증상인가'가 아니라서,
 * 관리자가 볼 이유가 없는 정보는 애초에 내려보내지 않는다.
 */
public record AdminUserDetailResponse(
        AdminUserSummaryResponse summary,
        List<Visit> visits,
        List<Activity> recentActivity
) {

    /** 치료 한 건과 그 안에서 벌어진 일 */
    public record Visit(
            Long visitId,
            String hospitalName,
            String departmentName,
            String visitReason,
            String treatmentStatus,
            java.time.LocalDate visitedAt,
            java.time.LocalDate medicationStartDate,
            java.time.LocalDate medicationEndDate,

            List<String> medicationNames,
            /** 지식베이스에서 못 찾은 약 — OCR 품질 문제를 여기서 발견한다 */
            long unmatchedMedicationCount,

            long doseTotal,
            long doseTaken,
            long doseSkipped,
            long doseMissed,

            long healthLogCount,
            long chatMessageCount,
            long reportCount
    ) {
    }

    /**
     * 최근 활동 타임라인 한 줄.
     * 종류가 다른 사건을 한 줄로 세우려고 최소한의 모양으로만 맞췄다.
     */
    public record Activity(
            /** DOSE / HEALTH_LOG / CHAT / REPORT / INTERACTION */
            String type,
            String summary,
            LocalDateTime at
    ) {
    }
}
