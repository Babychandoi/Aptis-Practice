package vn.weconex.aptis.platform.analytics;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Một lượt xem trang của học viên.
 *
 * <p>Không kế thừa BaseEntity: bảng này chỉ ghi thêm, không bao giờ sửa, nên
 * {@code updated_at} là cột thừa nhân với hàng trăm nghìn dòng.
 */
@Entity(name = "PageView")
@Table(name = "page_views")
@Getter
@Setter
@NoArgsConstructor
public class PageView {

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    private String id;

    /** NULL khi khách chưa đăng nhập. */
    @Column(name = "user_id", columnDefinition = "CHAR(36)")
    private String userId;

    /** Khóa trang ổn định, vd "plans", "affiliate" — không phải URL. */
    @Column(name = "page_key", length = 64, nullable = false)
    private String pageKey;

    @Column(name = "path", length = 500, nullable = false)
    private String path;

    /** Trang trước đó trong ứng dụng, để biết họ đến từ đâu. */
    @Column(name = "referrer_key", length = 64)
    private String referrerKey;

    @Column(name = "session_id", columnDefinition = "CHAR(36)")
    private String sessionId;

    /** Thời gian ở lại trang; NULL khi trình duyệt không kịp gửi. */
    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
}
