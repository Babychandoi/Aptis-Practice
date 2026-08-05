package vn.weconex.aptis.auth.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.auth.domain.OneTimeToken;

public interface PasswordResetTokenRepository
        extends JpaRepository<OneTimeToken.PasswordReset, String> {

    Optional<OneTimeToken.PasswordReset> findByTokenHash(String tokenHash);

    @Modifying
    @Query("""
            UPDATE PasswordResetToken t
            SET t.usedAt = :now
            WHERE t.userId = :userId AND t.usedAt IS NULL
            """)
    int invalidateAllForUser(@Param("userId") String userId, @Param("now") Instant now);
}
