package com.medilink.push.repository;

import com.medilink.push.entity.PushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushTokenRepository extends JpaRepository<PushToken, Long> {

    Optional<PushToken> findByToken(String token);

    Optional<PushToken> findByIdAndUserId(Long id, Long userId);

    List<PushToken> findAllByUserId(Long userId);
}
