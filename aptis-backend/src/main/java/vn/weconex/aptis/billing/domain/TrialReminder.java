package vn.weconex.aptis.billing.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Dấu vết đã nhắc một học viên về hạn dùng thử.
 *
 * <p>Hạn dùng thử suy ra từ {@code users.created_at} nên không có bản ghi nào để
 * đánh dấu. Không lưu lại thì job chạy mỗi 30 phút sẽ gửi lại cùng một mail cho
 * tới khi hết hạn.
 */
@Entity
@Table(name = "trial_reminders")
@IdClass(TrialReminder.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class TrialReminder {

    /** Mốc nhắc. Thêm mốc mới không cần sửa bảng. */
    public static final String BEFORE_EXPIRY = "BEFORE_EXPIRY";
    public static final String AFTER_EXPIRY = "AFTER_EXPIRY";

    @Id
    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Id
    @Column(name = "kind", length = 32, nullable = false)
    private String kind;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();

    public TrialReminder(String userId, String kind) {
        this.userId = userId;
        this.kind = kind;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Key implements java.io.Serializable {

        private String userId;
        private String kind;

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key key)) {
                return false;
            }
            return java.util.Objects.equals(userId, key.userId)
                    && java.util.Objects.equals(kind, key.kind);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(userId, kind);
        }
    }
}
