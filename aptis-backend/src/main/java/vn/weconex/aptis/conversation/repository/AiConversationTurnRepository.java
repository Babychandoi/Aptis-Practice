package vn.weconex.aptis.conversation.repository;

import java.util.List;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.conversation.domain.AiConversationTurn;

public interface AiConversationTurnRepository extends JpaRepository<AiConversationTurn, String> {

    /** Toàn bộ lượt nói của một phiên, đúng thứ tự đã nói. */
    List<AiConversationTurn> findBySessionIdOrderBySeqAsc(String sessionId);

    /** Số lượt đã ghi, để client biết đánh seq tiếp từ đâu sau khi tải lại trang. */
    long countBySessionId(String sessionId);

    /**
     * Lượt nói gần nhất của học viên, mới trước cũ sau.
     *
     * <p>Dùng khi phiên cũ đã đóng mà vẫn cần ngữ cảnh: lấy theo user chứ không
     * theo session vì học viên có thể đã nhảy qua vài phiên do mất kết nối.
     */
    @Query("""
        SELECT t FROM AiConversationTurn t
        WHERE t.userId = :userId ORDER BY t.createdAt DESC, t.seq DESC
        """)
    List<AiConversationTurn> findRecentByUser(@Param("userId") String userId, Limit limit);
}
