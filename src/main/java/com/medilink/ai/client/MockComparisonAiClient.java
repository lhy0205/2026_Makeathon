package com.medilink.ai.client;

import com.medilink.ai.dto.TreatmentComparisonRequest;
import com.medilink.ai.dto.TreatmentComparisonResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "mock", matchIfMissing = true)
public class MockComparisonAiClient implements ComparisonAiClient {

    @Override
    public TreatmentComparisonResult compareTreatments(TreatmentComparisonRequest request) {
        return new TreatmentComparisonResult(
                List.of("Mock: 두 치료에 공통된 치료 요소가 있습니다."),
                List.of("Mock: 이번 치료의 증상 점수 변화가 이전과 다릅니다."),
                "Mock: 전반적으로 이전 치료와 유사한 경과를 보이고 있습니다."
        );
    }
}
