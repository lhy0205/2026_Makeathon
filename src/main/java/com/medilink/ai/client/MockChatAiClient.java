package com.medilink.ai.client;

import com.medilink.ai.dto.ChatAnswer;
import com.medilink.ai.dto.ChatAskRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "mock", matchIfMissing = true)
public class MockChatAiClient implements ChatAiClient {

    @Override
    public ChatAnswer askChatbot(ChatAskRequest request) {
        return new ChatAnswer(
                "Mock 답변: \"" + request.question() + "\"에 대한 참고용 안내입니다. 실제 복약 상담은 의료진과 진행해 주세요.",
                List.of("Mock 참고자료 1", "Mock 참고자료 2")
        );
    }
}
