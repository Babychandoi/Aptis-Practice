package vn.weconex.aptis.platform.analytics;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Truy vấn thống kê lượt xem trang. */
public interface PageViewRepository extends JpaRepository<PageView, String> {

    /**
     * Xếp hạng trang theo lượt xem.
     *
     * <p>Trả Object[]{pageKey, lượt xem, số người, giây ở lại trung bình}.
     */
    @Query("""
            SELECT v.pageKey, COUNT(v), COUNT(DISTINCT v.userId), AVG(v.durationMs)
            FROM PageView v
            WHERE v.createdAt >= :from
            GROUP BY v.pageKey
            ORDER BY COUNT(v) DESC
            """)
    List<Object[]> rankPages(@Param("from") Instant from);

    /** Lượt xem theo ngày của một trang, cho biểu đồ xu hướng. */
    @Query("""
            SELECT FUNCTION('DATE', v.createdAt), COUNT(v), COUNT(DISTINCT v.userId)
            FROM PageView v
            WHERE v.pageKey = :pageKey AND v.createdAt >= :from
            GROUP BY FUNCTION('DATE', v.createdAt)
            ORDER BY FUNCTION('DATE', v.createdAt)
            """)
    List<Object[]> dailyTrend(@Param("pageKey") String pageKey, @Param("from") Instant from);

    /**
     * Những người đã xem một trang, kèm số lượt.
     *
     * <p>Dùng cho câu hỏi "ai vào trang nâng cấp mà chưa mua" — biết cụ thể để
     * còn chăm sóc, không chỉ đếm tổng.
     */
    @Query("""
            SELECT v.userId, COUNT(v), MAX(v.createdAt)
            FROM PageView v
            WHERE v.pageKey = :pageKey AND v.createdAt >= :from AND v.userId IS NOT NULL
            GROUP BY v.userId
            ORDER BY COUNT(v) DESC
            """)
    List<Object[]> viewersOf(@Param("pageKey") String pageKey, @Param("from") Instant from);

    /** Trang mà một học viên hay xem — xem họ quan tâm gì. */
    @Query("""
            SELECT v.pageKey, COUNT(v), MAX(v.createdAt)
            FROM PageView v
            WHERE v.userId = :userId AND v.createdAt >= :from
            GROUP BY v.pageKey
            ORDER BY COUNT(v) DESC
            """)
    List<Object[]> pagesOfUser(@Param("userId") String userId, @Param("from") Instant from);

    /** Trang mà người dùng đến ngay trước đó — biết luồng đi. */
    @Query("""
            SELECT v.referrerKey, COUNT(v)
            FROM PageView v
            WHERE v.pageKey = :pageKey AND v.createdAt >= :from AND v.referrerKey IS NOT NULL
            GROUP BY v.referrerKey
            ORDER BY COUNT(v) DESC
            """)
    List<Object[]> entryPointsOf(@Param("pageKey") String pageKey, @Param("from") Instant from);

    long countByPageKeyAndCreatedAtAfter(String pageKey, Instant from);

    /**
     * Dọn dữ liệu cũ.
     *
     * <p>Bảng này lớn nhanh và số liệu quá vài tháng không còn giúp ra quyết
     * định, giữ lại chỉ tốn đĩa và làm truy vấn chậm dần.
     */
    @Modifying
    @Query("DELETE FROM PageView v WHERE v.createdAt < :before")
    int deleteOlderThan(@Param("before") Instant before);
}
