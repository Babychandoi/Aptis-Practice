package vn.weconex.aptis.auth.domain;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;
import vn.weconex.aptis.common.util.Enums.UserStatus;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User extends BaseEntity {

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private UserStatus status = UserStatus.PENDING_VERIFICATION;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "phone_verified_at")
    private Instant phoneVerifiedAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id", columnDefinition = "CHAR(36)"),
            inverseJoinColumns = @JoinColumn(name = "role_id", columnDefinition = "CHAR(36)"))
    private Set<Role> roles = new HashSet<>();

    public static User register(String email, String passwordHash) {
        User user = new User();
        user.email = email.toLowerCase();
        user.passwordHash = passwordHash;
        user.status = UserStatus.PENDING_VERIFICATION;
        return user;
    }

    public boolean isCurrentlyLocked() {
        return lockedUntil != null && lockedUntil.isAfter(Instant.now());
    }

    public boolean canLogin() {
        return status == UserStatus.ACTIVE && !isCurrentlyLocked();
    }

    public void markEmailVerified() {
        emailVerifiedAt = Instant.now();
        if (status == UserStatus.PENDING_VERIFICATION) {
            status = UserStatus.ACTIVE;
        }
    }

    public void recordSuccessfulLogin() {
        lastLoginAt = Instant.now();
        failedLoginCount = 0;
        lockedUntil = null;
    }

    /**
     * @return true nếu lần thất bại này khiến tài khoản bị khóa tạm
     */
    public boolean recordFailedLogin(int maxAttempts, java.time.Duration lockDuration) {
        failedLoginCount++;
        if (failedLoginCount >= maxAttempts) {
            lockedUntil = Instant.now().plus(lockDuration);
            failedLoginCount = 0;
            return true;
        }
        return false;
    }
}
