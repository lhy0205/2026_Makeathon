package com.medilink.ai.client;

import com.medilink.ai.dto.ChatAnswer;
import com.medilink.ai.dto.ChatAskRequest;

public interface ChatAiClient {

    ChatAnswer askChatbot(ChatAskRequest request);
}
