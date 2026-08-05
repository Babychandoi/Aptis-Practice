package vn.weconex.aptis.entitlement.domain;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.junit.jupiter.api.Test;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Quyền Premium là thứ quyết định học viên truy cập được gì, nên hiệu lực theo
 * thời gian phải chính xác.
 */
class UserEntitlementTest {

    /**
     * Cột starts_at là DATETIME không có phần thập phân; MySQL LÀM TRÒN giá trị
     * có mili giây. Với .500 trở lên, thời điểm bắt đầu bị đẩy sang giây kế tiếp
     * và nằm ở tương lai — học viên vừa mua Premium mà chưa dùng được ngay.
     */
    @Test
    void truncatesStartsAtToSecondSoGrantTakesEffectImmediately() {
        Instant withMillis = Instant.parse("2026-08-01T10:15:30.750Z");

        UserEntitlement entitlement = grant(withMillis, null);

        assertThat(entitlement.getStartsAt())
                .isEqualTo(Instant.parse("2026-08-01T10:15:30Z"))
                .isBeforeOrEqualTo(withMillis);
    }

    @Test
    void grantedEntitlementIsActiveRightAway() {
        Instant now = Instant.parse("2026-08-01T10:15:30.999Z");

        UserEntitlement entitlement = grant(now, now.plus(30, ChronoUnit.DAYS));

        assertThat(entitlement.isActiveAt(now)).isTrue();
    }

    /** ends_at = null nghĩa là vĩnh viễn, không phải hết hạn. */
    @Test
    void nullEndsAtMeansPermanent() {
        Instant now = Instant.now();
        UserEntitlement entitlement = grant(now, null);

        assertThat(entitlement.isActiveAt(now.plus(3650, ChronoUnit.DAYS))).isTrue();
    }

    @Test
    void isNotActiveAfterEnd() {
        Instant now = Instant.now();
        UserEntitlement entitlement = grant(now, now.plus(7, ChronoUnit.DAYS));

        assertThat(entitlement.isActiveAt(now.plus(8, ChronoUnit.DAYS))).isFalse();
    }

    /** Thu hồi có hiệu lực ngay, bất kể ends_at còn xa. */
    @Test
    void revokedEntitlementIsNeverActive() {
        Instant now = Instant.now();
        UserEntitlement entitlement = grant(now, now.plus(30, ChronoUnit.DAYS));

        entitlement.revoke();

        assertThat(entitlement.isActiveAt(now)).isFalse();
        assertThat(entitlement.isActiveAt(now.plus(1, ChronoUnit.DAYS))).isFalse();
    }

    @Test
    void revokeIsIdempotent() {
        UserEntitlement entitlement = grant(Instant.now(), null);

        entitlement.revoke();
        Instant first = entitlement.getRevokedAt();
        entitlement.revoke();

        assertThat(entitlement.getRevokedAt()).isEqualTo(first);
    }

    /** Gia hạn chỉ kéo dài, không rút ngắn quyền đang có. */
    @Test
    void extendToOnlyMovesEndForward() {
        Instant now = Instant.now();
        UserEntitlement entitlement = grant(now, now.plus(30, ChronoUnit.DAYS));

        entitlement.extendTo(now.plus(10, ChronoUnit.DAYS));
        assertThat(entitlement.getEndsAt()).isEqualTo(now.plus(30, ChronoUnit.DAYS));

        entitlement.extendTo(now.plus(60, ChronoUnit.DAYS));
        assertThat(entitlement.getEndsAt()).isEqualTo(now.plus(60, ChronoUnit.DAYS));
    }

    private static UserEntitlement grant(Instant startsAt, Instant endsAt) {
        return UserEntitlement.grant(
                "user-1",
                UserEntitlement.PREMIUM_CONTENT_ACCESS,
                EntitlementSourceType.SUBSCRIPTION,
                "sub-1",
                startsAt,
                endsAt);
    }
}
