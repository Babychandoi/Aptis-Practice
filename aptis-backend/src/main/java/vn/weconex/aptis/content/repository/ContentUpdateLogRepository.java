package vn.weconex.aptis.content.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.content.domain.ContentUpdateLog;

public interface ContentUpdateLogRepository extends JpaRepository<ContentUpdateLog, String> {

    /** Chỉ mục đã publish, mới nhất trước. */
    @Query("""
            SELECT l FROM ContentUpdateLog l
            WHERE l.status = vn.weconex.aptis.content.domain.ContentUpdateLog$LogStatus.PUBLISHED
            ORDER BY l.logDate DESC, l.displayOrder ASC
            """)
    List<ContentUpdateLog> findPublished();

    /**
     * Bộ câu hỏi của từng mục nhật ký, kèm mã và tiêu đề để hiển thị.
     *
     * <p>Chỉ trả đề còn PUBLISHED: đề đã archive vẫn nằm trong bảng nối nhưng
     * không nên mời học viên bấm vào.
     *
     * <p>Nhận danh sách logId để cả trang chỉ tốn một truy vấn.
     */
    @Query(value = """
            SELECT m.log_id, q.id, q.code, q.title, q.item_count
            FROM content_update_log_question_sets m
            JOIN question_sets q ON q.id = m.question_set_id
            WHERE m.log_id IN (:logIds) AND q.status = 'PUBLISHED'
            ORDER BY m.display_order, q.code
            """, nativeQuery = true)
    List<Object[]> findQuestionSetsByLogIds(@Param("logIds") List<String> logIds);
}
