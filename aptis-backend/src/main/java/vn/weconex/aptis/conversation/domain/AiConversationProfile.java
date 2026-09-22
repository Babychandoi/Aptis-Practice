package vn.weconex.aptis.conversation.domain;

import java.time.Instant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Hồ sơ dài hạn của học viên trong phòng AI Voice.
 *
 * <p>Khác {@link AiConversationSession#getSummary()} vốn chỉ nhớ phiên liền
 * trước: hồ sơ này nhớ xuyên suốt mọi phiên, nên hôm sau quay lại AI vẫn biết
 * tên và những gì đã kể.
 *
 * <p>Khoá chính là userId nên không kế thừa BaseEntity (mỗi học viên đúng một
 * dòng, không cần id riêng).
 */
@Entity
@Table(name = "ai_conversation_profiles")
@Getter @Setter @NoArgsConstructor
public class AiConversationProfile {

    @Id
    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    /** JSON: tên, nghề, sở thích, lỗi hay mắc, chủ đề đang dở. */
    @Column(name = "facts", columnDefinition = "json")
    private String facts;

    /**
     * JSON: yêu cầu phong cách (english only, đừng cà khịa, xưng tao-mày...).
     *
     * <p>Tách khỏi facts vì prompt phải tôn trọng phần này ngay lập tức, còn
     * facts chỉ là chất liệu để AI nhắc lại chuyện cũ.
     */
    @Column(name = "style_prefs", columnDefinition = "json")
    private String stylePrefs;

    @Column(name = "last_summary", columnDefinition = "TEXT")
    private String lastSummary;

    @Column(name = "total_sessions", nullable = false)
    private int totalSessions;

    @Column(name = "last_session_at")
    private Instant lastSessionAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
