package com.medilink.ai.client;

import com.medilink.ai.dto.TreatmentComparisonRequest;
import com.medilink.ai.dto.TreatmentComparisonResult;

public interface ComparisonAiClient {

    TreatmentComparisonResult compareTreatments(TreatmentComparisonRequest request);
}
