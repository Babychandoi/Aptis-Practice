package vn.weconex.aptis.conversation.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/**
 * Một lượt nói trong phòng AI Voice, ghi ngay khi phát sinh.
 *
 * <p>Trước đây transcript chỉ nằm trong RAM trình duyệt và chỉ gửi về lúc đóng
 * phiên. Đóng tab đột ngột hoặc mất mạng là mất sạch, nên phiên sau không biết
 * đã nói những gì.
 */
@Entity
@Table(name = "ai_conversation_turns")
@Getter @Setter @NoArgsConstructor
public class AiConversationTurn extends BaseEntity {

    @Column(name = "session_id", columnDefinition = "CHAR(36)", nullable = false)
    private String sessionId;

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    /** "user" hoặc "ai" — khớp nhãn transcript của frontend. */
    @Column(name = "role", length = 10, nullable = false)
    private String role;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    /**
     * Thứ tự trong phiên, do client đánh số.
     *
     * <p>Không sắp xếp theo createdAt: nhiều lượt có thể rơi vào cùng một giây
     * nên thứ tự sẽ không ổn định, mà thứ tự sai thì ngữ cảnh đọc thành vô nghĩa.
     */
    @Column(name = "seq", nullable = false)
    private int seq;
    @Column(name = "client_turn_id", length = 100)
    private String clientTurnId;
    @Column(name = "revision", nullable = false)
    private long revision;
}
