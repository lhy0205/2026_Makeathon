package com.medilink.admin;

import com.medilink.user.entity.User;
import com.medilink.user.entity.UserRole;
import com.medilink.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 계정을 만든다.
 *
 * 가입은 전부 USER로 되고 role을 올려주는 화면이 없어서,
 * 이게 없으면 관리자 페이지에 들어갈 수 있는 사람이 아무도 없다.
 *
 * 설정이 비어 있으면 아무 일도 하지 않는다 —
 * 운영 환경에 기본 관리자 계정이 딸려 들어가는 일이 없어야 한다.
 *
 *   ADMIN_BOOTSTRAP_EMAIL=admin@medi.com
 *   ADMIN_BOOTSTRAP_PASSWORD=...
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountBootstrap implements ApplicationRunner {

    private static final String DEFAULT_NICKNAME = "관리자";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.bootstrap.email:}")
    private String email;

    @Value("${admin.bootstrap.password:}")
    private String password;

    // .properties는 ISO-8859-1로 읽히므로 한글 기본값을 그쪽에 두지 않는다.
    // 비어 있으면 아래 DEFAULT_NICKNAME을 쓴다.
    @Value("${admin.bootstrap.nickname:}")
    private String nickname;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.isBlank()) {
            log.info("관리자 부트스트랩 설정이 없어 건너뜁니다.");
            return;
        }

        userRepository.findByEmail(email).ifPresentOrElse(
                this::promote,
                this::create
        );
    }

    private void promote(User user) {
        if (user.getRole() == UserRole.ADMIN) {
            log.info("관리자 계정이 이미 있습니다: {}", email);
            return;
        }

        // 이미 쓰던 계정이라면 비밀번호는 건드리지 않는다. 권한만 올린다
        user.grantAdmin();
        log.info("기존 계정을 관리자로 올렸습니다: {}", email);
    }

    private void create() {
        String name = nickname.isBlank() ? DEFAULT_NICKNAME : nickname;
        User admin = new User(email, passwordEncoder.encode(password), name);
        admin.grantAdmin();
        userRepository.save(admin);
        log.info("관리자 계정을 만들었습니다: {}", email);
    }
}
