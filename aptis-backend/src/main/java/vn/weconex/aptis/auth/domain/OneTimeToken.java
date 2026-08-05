package vn.weconex.aptis.auth.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Token dùng một lần cho xác thực email và đặt lại mật khẩu.
 * Hai bảng có cấu trúc giống nhau nhưng tách riêng để dễ thu hồi độc lập
 * và để rate-limit riêng từng luồng.
 */
@MappedSuperclass
@Getter
@Setter
@NoArgsConstructor
public abstract class OneTimeToken {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "token_hash", length = 255, nullable = false)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public boolean isUsable() {
        return usedAt == null && expiresAt.isAfter(Instant.now());
    }

    public void markUsed() {
        usedAt = Instant.now();
    }

    @Entity(name = "EmailVerificationToken")
    @Table(name = "email_verification_tokens")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class EmailVerification extends OneTimeToken {

        public static EmailVerification create(String userId, String tokenHash, Instant expiresAt) {
            EmailVerification token = new EmailVerification();
            token.setUserId(userId);
            token.setTokenHash(tokenHash);
            token.setExpiresAt(expiresAt);
            return token;
        }
    }

    @Entity(name = "PasswordResetToken")
    @Table(name = "password_reset_tokens")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class PasswordReset extends OneTimeToken {

        public static PasswordReset create(String userId, String tokenHash, Instant expiresAt) {
            PasswordReset token = new PasswordReset();
            token.setUserId(userId);
            token.setTokenHash(tokenHash);
            token.setExpiresAt(expiresAt);
            return token;
        }
    }
}
