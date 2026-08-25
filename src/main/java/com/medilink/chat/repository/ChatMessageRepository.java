package com.medilink.chat.repository;

import com.medilink.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findAllByVisitIdOrderByCreatedAtAsc(Long visitId);

    // 관리자 화면: 한 사용자의 챗봇 대화
    List<ChatMessage> findAllByVisitUserIdOrderByCreatedAtDesc(Long userId);

    long countByVisitId(Long visitId);

    void deleteAllByVisitId(Long visitId);
}
