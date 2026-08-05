package vn.weconex.aptis.auth.service;

import java.time.Instant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.repository.RefreshTokenRepository;

/**
 * Thu hồi refresh token trong transaction độc lập.
 *
 * <p>Tách thành bean riêng vì {@code @Transactional(REQUIRES_NEW)} chỉ có hiệu
 * lực khi được gọi qua proxy Spring — gọi nội bộ trong cùng class sẽ bị bỏ qua.
 *
 * <p>Dùng khi phát hiện refresh token bị tái sử dụng: việc thu hồi phải commit
 * được kể cả khi request đó kết thúc bằng exception (PHẦN IV §30).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRevoker {

    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int revokeAllForUserInNewTransaction(String userId) {
        int revoked = refreshTokenRepository.revokeAllForUser(userId, Instant.now());
        log.warn("Đã thu hồi {} refresh token của user {}", revoked, userId);
        return revoked;
    }
}
