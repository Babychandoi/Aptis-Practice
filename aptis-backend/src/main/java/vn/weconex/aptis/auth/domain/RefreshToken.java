package vn.weconex.aptis.auth.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Refresh token là opaque random string; DB chỉ lưu hash.
 * Khi được dùng, token cũ bị revoke và trỏ replaced_by_token_id sang token mới
 * để phát hiện tái sử dụng (token reuse detection).
 */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
public class RefreshToken {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "token_hash", length = 255, nullable = false)
    private String tokenHash;

    @Column(name = "device_id", length = 255)
    private String deviceId;

    @Column(name = "user_agent", length = 1000)
    private String userAgent;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    /**
     * Lý do thu hồi. {@link #SUPERSEDED} nghĩa là bị đẩy ra vì đăng nhập ở nơi
     * khác — dùng lại token đó KHÔNG phải dấu hiệu bị đánh cắp, nên không thu
     * hồi cả các phiên còn lại. NULL = thu hồi bình thường.
     */
    @Column(name = "revoke_reason", length = 32)
    private String revokeReason;

    /** Bị thay thế bởi phiên đăng nhập mới (chính sách một phiên). */
    public static final String SUPERSEDED = "SUPERSEDED";

    @Column(name = "replaced_by_token_id", columnDefinition = "CHAR(36)")
    private String replacedByTokenId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public static RefreshToken issue(
            String userId, String tokenHash, Instant expiresAt,
            String deviceId, String userAgent, String ipAddress) {

        RefreshToken token = new RefreshToken();
        token.userId = userId;
        token.tokenHash = tokenHash;
        token.expiresAt = expiresAt;
        token.deviceId = deviceId;
        token.userAgent = userAgent;
        token.ipAddress = ipAddress;
        return token;
    }

    public boolean isActive() {
        return revokedAt == null && expiresAt.isAfter(Instant.now());
    }

    public void revoke() {
        if (revokedAt == null) {
            revokedAt = Instant.now();
        }
    }

    public void rotateTo(String newTokenId) {
        revoke();
        this.replacedByTokenId = newTokenId;
    }
}
