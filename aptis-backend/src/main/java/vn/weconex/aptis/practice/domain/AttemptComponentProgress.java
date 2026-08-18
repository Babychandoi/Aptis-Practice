package vn.weconex.aptis.practice.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/**
 * Tiến độ một kỹ năng trong lượt thi đủ 5 kỹ năng.
 *
 * <p>Đề thật cấp cho mỗi kỹ năng một khoảng thời gian riêng và khóa lại khi nộp,
 * nên không thể dùng chung {@code test_attempts.expires_at}.
 *
 * <p>Chỉ sinh cho lượt {@code MOCK_TEST} không gắn component; luyện từng part
 * vẫn dùng mốc hết giờ của cả lượt.
 */
@Entity
@Table(name = "attempt_component_progress")
@Getter
@Setter
@NoArgsConstructor
public class AttemptComponentProgress extends BaseEntity {

    @Column(name = "attempt_id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String attemptId;

    @Column(name = "component_id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String componentId;

    /**
     * Chép từ {@code components.display_order} lúc bắt đầu lượt. Giữ bản sao để
     * thứ tự kỹ năng của lượt đang thi không đổi nếu sau này biên tập sắp xếp
     * lại danh mục.
     */
    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    /** null = chưa tới lượt kỹ năng này. */
    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    /** Đã nộp: không sửa và không xem lại được nữa. */
    @Column(name = "submitted_at")
    private Instant submittedAt;

    public boolean isSubmitted() {
        return submittedAt != null;
    }

    public boolean isOpen() {
        return startedAt != null && submittedAt == null;
    }

    /** Đang mở nhưng đã quá giờ — cần đóng lại trước khi xử lý thao tác mới. */
    public boolean isOverdue(Instant now) {
        return isOpen() && expiresAt != null && now.isAfter(expiresAt);
    }

    public void open(Instant now, Instant expiresAt) {
        this.startedAt = now;
        this.expiresAt = expiresAt;
    }
}
