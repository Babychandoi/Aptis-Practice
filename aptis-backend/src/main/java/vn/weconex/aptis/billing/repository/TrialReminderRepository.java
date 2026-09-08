package vn.weconex.aptis.billing.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.billing.domain.TrialReminder;

public interface TrialReminderRepository
        extends JpaRepository<TrialReminder, TrialReminder.Key> {

    /**
     * Học viên cần nhắc "sắp hết dùng thử".
     *
     * <p>Điều kiện: đã xác thực email, chưa mua gói, hạn dùng thử rơi vào cửa sổ
     * sắp tới, và chưa từng nhận mail này.
     *
     * <p>Native query vì phải tính hạn từ {@code created_at} — dùng thử không có
     * bản ghi riêng nên JPQL không diễn đạt được phép cộng ngày.
     */
    @Query(value = """
            SELECT u.id, u.email, u.created_at + INTERVAL :trialDays DAY AS trial_ends_at
            FROM users u
            WHERE u.email_verified_at IS NOT NULL
              AND u.status = 'ACTIVE'
              AND u.created_at + INTERVAL :trialDays DAY BETWEEN :from AND :to
              AND NOT EXISTS (
                    SELECT 1 FROM user_entitlements e
                    WHERE e.user_id = u.id
                      AND e.entitlement_code = :premiumCode
                      AND e.revoked_at IS NULL
                      AND (e.ends_at IS NULL OR e.ends_at > :now))
              AND NOT EXISTS (
                    SELECT 1 FROM trial_reminders r
                    WHERE r.user_id = u.id AND r.kind = :kind)
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findDueForReminder(
            @Param("trialDays") int trialDays,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("premiumCode") String premiumCode,
            @Param("now") Instant now,
            @Param("kind") String kind,
            @Param("limit") int limit);
}
