package com.medilink.prescription.storage;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

public record StoredPrescriptionImage(
        Resource resource,
        MediaType mediaType
) {
}
