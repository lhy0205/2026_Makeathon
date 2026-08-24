package com.medilink.ai.client;

import com.medilink.ai.dto.GeneratedReport;
import com.medilink.ai.dto.ReportGenerationRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "mock", matchIfMissing = true)
public class MockReportAiClient implements ReportAiClient {

    @Override
    public GeneratedReport generateReport(ReportGenerationRequest request) {
        return new GeneratedReport(
                "Mock 요약: " + request.visit().hospitalName() + " 치료 기간 동안의 경과입니다.",
                "Mock: 증상 점수가 점차 호전되는 추세입니다.",
                "Mock: 보고된 특이 부작용이 없습니다.",
                "Mock: 수면·수분 섭취가 대체로 양호했습니다.",
                0.0,
                "Mock: 다음 방문 시 복약 순응도를 함께 확인해 주세요."
        );
    }
}
