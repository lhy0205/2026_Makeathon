package com.medilink.admin.dto;

import com.medilink.user.entity.User;

import java.time.LocalDateTime;

/**
 * 관리자 사용자 목록의 한 줄.
 * 누가 얼마나 쓰고 있는지를 한눈에 보기 위한 요약이라, 상세는 담지 않는다.
 */
public record AdminUserSummaryResponse(
        Long id,
        String email,
        String nickname,
        String role,
        LocalDateTime joinedAt,

        long visitCount,
        long medicationCount,

        long doseTotal,
        long doseTaken,
        /** 기록한 일정 중 복용 비율 (%) */
        double adherenceRate,

        long healthLogCount,
        long chatMessageCount,
        long reportCount,
        long interactionWarningCount,

        /** 마지막으로 무언가를 남긴 시각. 없으면 null */
        LocalDateTime lastActiveAt
) {

    public static AdminUserSummaryResponse of(
            User user,
            long visitCount,
            long medicationCount,
            long doseTotal,
            long doseTaken,
            double adherenceRate,
            long healthLogCount,
            long chatMessageCount,
            long reportCount,
            long interactionWarningCount,
            LocalDateTime lastActiveAt
    ) {
        return new AdminUserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole().name(),
                user.getCreatedAt(),
                visitCount,
                medicationCount,
                doseTotal,
                doseTaken,
                adherenceRate,
                healthLogCount,
                chatMessageCount,
                reportCount,
                interactionWarningCount,
                lastActiveAt
        );
    }
}
