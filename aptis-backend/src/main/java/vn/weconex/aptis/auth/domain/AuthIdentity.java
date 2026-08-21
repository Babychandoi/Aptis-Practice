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
 * Liên kết tài khoản với nhà cung cấp đăng nhập ngoài (hiện chỉ Google).
 *
 * <p>Khoá nhận dạng là {@code providerUserId} — mã {@code sub} của Google, không
 * đổi suốt đời tài khoản. KHÔNG dùng email làm khoá: người dùng đổi được email
 * Google, còn {@code sub} thì không.
 *
 * <p>{@code providerEmail} lưu để đối soát và hỗ trợ, không dùng để tra cứu.
 */
@Entity
@Table(name = "auth_identities")
@Getter
@Setter
@NoArgsConstructor
public class AuthIdentity {

    public static final String GOOGLE = "GOOGLE";

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "provider", length = 50, nullable = false)
    private String provider;

    @Column(name = "provider_user_id", length = 255, nullable = false)
    private String providerUserId;

    @Column(name = "provider_email", length = 255)
    private String providerEmail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public static AuthIdentity google(String userId, String providerUserId, String email) {
        AuthIdentity identity = new AuthIdentity();
        identity.userId = userId;
        identity.provider = GOOGLE;
        identity.providerUserId = providerUserId;
        identity.providerEmail = email;
        return identity;
    }
}
