package vn.weconex.aptis.progress.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.progress.domain.UserQuestionStats;

/**
 * Số liệu cho bảng điều khiển học viên, tính thẳng từ bài làm.
 *
 * <p>Không đọc user_daily_learning_stats hay user_component_progress: hai bảng
 * đó có từ đầu nhưng chưa có code nào ghi, nên luôn trống. Tính từ test_attempts
 * thì số liệu đúng ngay, kể cả với bài làm từ trước khi có trang này.
 *
 * <p>Ngày tính theo giờ Việt Nam (UTC+7): cột datetime lưu UTC, gom theo ngày
 * UTC thì bài làm lúc 6 giờ sáng bị tính sang hôm trước. Cộng thẳng 7 giờ thay
 * cho CONVERT_TZ vì MySQL trong container không nạp bảng múi giờ.
 */
public interface DashboardStatsRepository extends JpaRepository<UserQuestionStats, String> {

    /**
     * Các ngày có luyện tập, mới nhất trước. Trả Object[]{ngày, số giây}.
     *
     * <p>Tính cả bài chưa nộp: học viên đã ngồi làm là đã học hôm đó, chuỗi ngày
     * không nên đứt chỉ vì bỏ dở một bài.
     */
    @Query(value = """
            SELECT DATE(DATE_ADD(ta.started_at, INTERVAL 7 HOUR)) AS d,
                   SUM(COALESCE(ta.time_spent_seconds, ta.duration_seconds, 0))
            FROM test_attempts ta
            WHERE ta.user_id = :userId
              AND ta.started_at IS NOT NULL
              AND ta.started_at >= :since
            GROUP BY d
            ORDER BY d DESC
            """, nativeQuery = true)
    List<Object[]> activeDays(@Param("userId") String userId, @Param("since") Instant since);

    /**
     * Điểm trung bình từng kỹ năng. Trả Object[]{mã kỹ năng, % trung bình, số bài}.
     *
     * <p>Chỉ bài đã chấm xong: bài đang chấm chưa có điểm Writing/Speaking, đưa
     * vào sẽ kéo điểm kỹ năng đó xuống sai.
     */
    @Query(value = """
            SELECT c.code, AVG(acs.percentage_score), COUNT(*)
            FROM attempt_component_scores acs
            JOIN test_attempts ta ON ta.id = acs.attempt_id
            JOIN components c ON c.id = acs.component_id
            WHERE ta.user_id = :userId
              AND ta.status = 'COMPLETED'
              AND acs.percentage_score IS NOT NULL
              AND ta.completed_at >= :since
            GROUP BY c.code
            """, nativeQuery = true)
    List<Object[]> skillScores(@Param("userId") String userId, @Param("since") Instant since);
}
