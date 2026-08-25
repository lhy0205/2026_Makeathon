package com.medilink.visit.service;

import com.medilink.global.exception.ApiException;
import com.medilink.user.entity.User;
import com.medilink.user.service.UserService;
import com.medilink.visit.dto.CompleteVisitRequest;
import com.medilink.visit.dto.VisitRequest;
import com.medilink.visit.dto.VisitResponse;
import com.medilink.visit.entity.Visit;
import com.medilink.visit.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VisitService {

    private final VisitRepository visitRepository;
    private final UserService userService;

    @Transactional
    public VisitResponse createVisit(Long userId, VisitRequest request) {
        validateMedicationPeriod(request.medicationStartDate(), request.medicationEndDate());

        User user = userService.getUser(userId);
        Visit visit = new Visit(
                user,
                request.hospitalName(),
                request.departmentName(),
                request.visitedAt(),
                request.visitReason(),
                request.medicationStartDate(),
                request.medicationEndDate()
        );

        Visit savedVisit = visitRepository.save(visit);

        return VisitResponse.from(savedVisit);
    }

    @Transactional(readOnly = true)
    public List<VisitResponse> getVisits(Long userId) {
        return visitRepository.findAllByUserIdOrderByVisitedAtDesc(userId)
                .stream()
                .map(VisitResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public VisitResponse getVisit(Long userId, Long visitId) {
        return VisitResponse.from(getOwnedVisit(userId, visitId));
    }

    @Transactional(readOnly = true)
    public List<VisitResponse> getMonthlyVisits(Long userId, int year, int month) {
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        return visitRepository.findAllByUserIdAndVisitedAtBetweenOrderByVisitedAt(
                        userId,
                        startDate,
                        endDate
                )
                .stream()
                .map(VisitResponse::from)
                .toList();
    }

    @Transactional
    public VisitResponse updateVisit(Long userId, Long visitId, VisitRequest request) {
        validateMedicationPeriod(request.medicationStartDate(), request.medicationEndDate());

        Visit visit = getOwnedVisit(userId, visitId);
        visit.update(
                request.hospitalName(),
                request.departmentName(),
                request.visitedAt(),
                request.visitReason(),
                request.medicationStartDate(),
                request.medicationEndDate()
        );

        return VisitResponse.from(visit);
    }

    @Transactional
    public void deleteVisit(Long userId, Long visitId) {
        Visit visit = getOwnedVisit(userId, visitId);
        visitRepository.delete(visit);
    }

    @Transactional
    public VisitResponse completeVisit(Long userId, Long visitId, CompleteVisitRequest request) {
        Visit visit = getOwnedVisit(userId, visitId);
        visit.complete(request.completedAt());

        return VisitResponse.from(visit);
    }

    public Visit getOwnedVisit(Long userId, Long visitId) {
        return visitRepository.findByIdAndUserId(visitId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "병원 방문 기록을 찾을 수 없습니다."));
    }

    private void validateMedicationPeriod(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "복약 종료일은 시작일보다 빠를 수 없습니다.");
        }
    }
}
