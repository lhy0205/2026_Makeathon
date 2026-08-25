package com.medilink.user.service;

import com.medilink.global.exception.ApiException;
import com.medilink.user.dto.UpdateProfileRequest;
import com.medilink.user.dto.UserResponse;
import com.medilink.user.entity.User;
import com.medilink.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserResponse getMyProfile(Long userId) {
        User user = getUser(userId);

        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateMyProfile(Long userId, UpdateProfileRequest request) {
        User user = getUser(userId);
        user.updateNickname(request.nickname());

        return UserResponse.from(user);
    }

    public User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }
}
