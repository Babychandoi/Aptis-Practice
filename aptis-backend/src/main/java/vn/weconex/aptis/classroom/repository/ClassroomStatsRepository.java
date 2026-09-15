package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;

/**
 * Thống kê học tập của cả lớp.
 *
 * <p>Tách khỏi {@link ClassroomRepository} vì đây là truy vấn đọc xuyên sang
 * dữ liệu luyện tập, không phải thao tác trên chính bảng lớp.
 *
 * <p>Mọi truy vấn đều gộp cho cả danh sách học viên trong một lần gọi — lặp
 * từng người sẽ thành N+1 với lớp vài chục học viên.
 */
public interface ClassroomStatsRepository extends JpaRepository<Classroom, String> {

    /**
     * Số lượt làm bài và điểm trung bình của từng học viên.
     *
     * <p>Trả Object[]{userId, số lượt hoàn thành, điểm trung bình thang 10,
     * lần hoạt động gần nhất}. Chỉ tính lượt đã COMPLETED: bài đang làm dở chưa
     * có điểm, đưa vào sẽ kéo trung bình xuống sai.
     */
    @Query(value = """
            SELECT ta.user_id,
                   COUNT(*),
                   AVG(ta.percentage_score) / 10,
                   MAX(ta.created_at)
            FROM test_attempts ta
            WHERE ta.user_id IN (:userIds)
              AND ta.status = 'COMPLETED'
              AND ta.percentage_score IS NOT NULL
            GROUP BY ta.user_id
            """, nativeQuery = true)
    List<Object[]> summaryByUsers(@Param("userIds") List<String> userIds);

    /**
     * Điểm trung bình của cả lớp theo từng kỹ năng.
     *
     * <p>Trả Object[]{componentCode, componentName, phần trăm}. Dùng cho biểu
     * đồ "điểm mạnh / yếu theo Part" — thấy ngay lớp yếu phần nào.
     */
    @Query(value = """
            SELECT c.code, c.name, ROUND(AVG(p.average_score))
            FROM user_component_progress p
            JOIN components c ON c.id = p.component_id
            WHERE p.user_id IN (:userIds) AND p.total_attempts > 0
            GROUP BY c.code, c.name, c.display_order
            ORDER BY c.display_order
            """, nativeQuery = true)
    List<Object[]> classProgressByUsers(@Param("userIds") List<String> userIds);
}
