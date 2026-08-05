package vn.weconex.aptis.auth.domain;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import vn.weconex.aptis.common.util.Enums.CefrLevel;

/**
 * PK là user_id (quan hệ 1-1 với users), không dùng id riêng.
 */
@Entity
@Table(name = "user_profiles")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class UserProfile {

    public enum Gender {
        MALE,
        FEMALE,
        OTHER,
        UNSPECIFIED
    }

    @Id
    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String userId;

    @Column(name = "full_name", length = 255)
    private String fullName;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(name = "avatar_object_key", length = 500)
    private String avatarObjectKey;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 16)
    private Gender gender = Gender.UNSPECIFIED;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_cefr_level", length = 4)
    private CefrLevel targetCefrLevel;

    @Column(name = "target_exam_date")
    private LocalDate targetExamDate;

    @Column(name = "timezone", nullable = false, length = 50)
    private String timezone = "Asia/Ho_Chi_Minh";

    @Column(name = "locale", nullable = false, length = 20)
    private String locale = "vi-VN";

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static UserProfile forUser(String userId) {
        UserProfile profile = new UserProfile();
        profile.userId = userId;
        return profile;
    }
}
