package com.medilink.ai.client;

import com.medilink.ai.dto.PrescriptionAnalysisResult;
import org.springframework.web.multipart.MultipartFile;

public interface AiClient {

    PrescriptionAnalysisResult analyzePrescription(MultipartFile image);
}
