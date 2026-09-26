package vn.weconex.aptis.platform.admin;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Số liệu tổng quan cho trang Báo cáo quản trị (mock 09/2026): 4 ô KPI tháng
 * này, doanh thu 7 ngày và lượt làm bài theo kỹ năng 30 ngày.
 *
 * <p>DB lưu giờ UTC; cộng 7 tiếng để chia ngày/tháng theo giờ Việt Nam, nếu
 * không đơn trả lúc 0h–7h sáng bị tính vào hôm trước.
 */
@RestController
@RequestMapping("/api/v1/admin/reports/summary")
@RequiredArgsConstructor
public class AdminReportSummaryController {

    /** Biểu thức "bây giờ theo giờ Việt Nam" dùng chung cho mọi câu. */
    private static final String VN_NOW = "DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR)";
    private static final String MONTH_START = "DATE_FORMAT(" + VN_NOW + ", '%Y-%m-01')";

    private final EntityManager entityManager;

    public record DayAmount(String date, long amount) {
    }

    public record SkillCount(String componentCode, String componentName, long count) {
    }

    public record Summary(
            int month,
            long monthRevenue,
            long paidOrders,
            long newUsers,
            long evaluations,
            List<DayAmount> revenue7d,
            List<SkillCount> attemptsBySkill30d) {
    }

    @GetMapping
    @PreAuthorize("hasAuthority('report:read')")
    @Transactional(readOnly = true)
    public Summary summary() {
        long revenue = scalar("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status IN ('PAID','PARTIALLY_REFUNDED')"
                + " AND DATE_ADD(paid_at, INTERVAL 7 HOUR) >= " + MONTH_START);
        long paid = scalar("SELECT COUNT(*) FROM orders WHERE status IN ('PAID','PARTIALLY_REFUNDED','REFUNDED')"
                + " AND DATE_ADD(paid_at, INTERVAL 7 HOUR) >= " + MONTH_START);
        long users = scalar("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"
                + " AND DATE_ADD(created_at, INTERVAL 7 HOUR) >= " + MONTH_START);
        long evaluations = scalar("SELECT COUNT(*) FROM evaluation_jobs WHERE status = 'COMPLETED'"
                + " AND DATE_ADD(completed_at, INTERVAL 7 HOUR) >= " + MONTH_START);

        // Đủ 7 ngày, ngày không có đơn vẫn hiện cột 0 để biểu đồ không bị hụt.
        Map<String, Long> byDay = new LinkedHashMap<>();
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        for (int i = 6; i >= 0; i--) {
            byDay.put(today.minusDays(i).toString(), 0L);
        }
        for (Object row : entityManager.createNativeQuery("""
                SELECT DATE_FORMAT(DATE_ADD(paid_at, INTERVAL 7 HOUR), '%Y-%m-%d') d, SUM(total_amount)
                FROM orders
                WHERE status IN ('PAID','PARTIALLY_REFUNDED')
                  AND DATE_ADD(paid_at, INTERVAL 7 HOUR) >= DATE_SUB(DATE(""" + VN_NOW + "), INTERVAL 6 DAY)"
                + " GROUP BY d").getResultList()) {
            Object[] r = (Object[]) row;
            byDay.computeIfPresent((String) r[0], (k, v) -> ((Number) r[1]).longValue());
        }
        List<DayAmount> revenue7d = new ArrayList<>();
        byDay.forEach((d, a) -> revenue7d.add(new DayAmount(d, a)));

        // Kỹ năng lấy từ component của lượt, hoặc của part khi luyện theo Part.
        List<SkillCount> skills = new ArrayList<>();
        for (Object row : entityManager.createNativeQuery("""
                SELECT c.code, c.name, COUNT(*)
                FROM test_attempts a
                LEFT JOIN parts p ON p.id = a.part_id
                JOIN components c ON c.id = COALESCE(a.component_id, p.component_id)
                WHERE a.created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY
                GROUP BY c.code, c.name
                ORDER BY COUNT(*) DESC
                """).getResultList()) {
            Object[] r = (Object[]) row;
            skills.add(new SkillCount((String) r[0], (String) r[1], ((Number) r[2]).longValue()));
        }

        return new Summary(today.getMonthValue(), revenue, paid, users, evaluations, revenue7d, skills);
    }

    private long scalar(String sql) {
        return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }
}
