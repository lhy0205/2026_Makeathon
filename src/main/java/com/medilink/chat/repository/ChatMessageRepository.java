package com.medilink.chat.repository;

import com.medilink.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findAllByVisitIdOrderByCreatedAtAsc(Long visitId);

    void deleteAllByVisitId(Long visitId);
}
