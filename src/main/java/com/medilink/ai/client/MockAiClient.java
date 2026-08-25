package com.medilink.ai.client;

import com.medilink.ai.dto.AnalyzedMedication;
import com.medilink.ai.dto.PrescriptionAnalysisResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "mock", matchIfMissing = true)
public class MockAiClient implements AiClient {

    @Override
    public PrescriptionAnalysisResult analyzePrescription(MultipartFile image) {
        AnalyzedMedication medication = new AnalyzedMedication(
                "예시약",
                "199900001",
                BigDecimal.ONE,
                "정",
                3,
                7,
                "식후 30분",
                "증상 완화",
                "복용 후 이상 반응이 있으면 의료진과 상담하세요.",
                0.95,
                false
        );

        return new PrescriptionAnalysisResult(
                "Mock OCR 결과",
                "예시병원",
                "내과",
                List.of(medication),
                null
        );
    }
}
