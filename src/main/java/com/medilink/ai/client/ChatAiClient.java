package com.medilink.ai.client;

import com.medilink.ai.dto.ChatAnswer;
import com.medilink.ai.dto.ChatAskRequest;
import reactor.core.publisher.Flux;

public interface ChatAiClient {

    ChatAnswer askChatbot(ChatAskRequest request);

    Flux<String> streamChatbot(ChatAskRequest request);
}
