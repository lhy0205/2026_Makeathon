package com.medilink.ai.dto;

import java.util.List;

public record ChatAnswer(String answer, List<String> sources) {
}
