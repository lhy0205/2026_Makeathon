package com.medilink.ai.client;

import com.medilink.ai.dto.GeneratedReport;
import com.medilink.ai.dto.ReportGenerationRequest;

public interface ReportAiClient {

    GeneratedReport generateReport(ReportGenerationRequest request);
}
