package vn.weconex.aptis.auth.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.auth.domain.OneTimeToken;

public interface EmailVerificationTokenRepository
        extends JpaRepository<OneTimeToken.EmailVerification, String> {

    Optional<OneTimeToken.EmailVerification> findByTokenHash(String tokenHash);

    @Modifying
    @Query("""
            UPDATE EmailVerificationToken t
            SET t.usedAt = :now
            WHERE t.userId = :userId AND t.usedAt IS NULL
            """)
    int invalidateAllForUser(@Param("userId") String userId, @Param("now") Instant now);

    /**
     * Số token đã phát cho user kể từ mốc thời gian — dùng để chặn bấm "gửi
     * lại" liên tục. Endpoint gửi lại không cần đăng nhập, nên nếu không giới
     * hạn thì một người có thể vét hết quota gửi thư trong ngày.
     */
    @Query("""
            SELECT COUNT(t) FROM EmailVerificationToken t
            WHERE t.userId = :userId AND t.createdAt >= :since
            """)
    long countIssuedSince(@Param("userId") String userId, @Param("since") Instant since);
}
