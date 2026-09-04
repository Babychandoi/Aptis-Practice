package vn.weconex.aptis.auth.web;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import vn.weconex.aptis.common.util.Enums.UserStatus;

public final class AdminUserDtos {

    private AdminUserDtos() {
    }

    public record AdminUserResponse(
            String id,
            String email,
            String phone,
            UserStatus status,
            boolean emailVerified,
            String fullName,
            String displayName,
            List<String> roles,
            boolean premiumActive,
            Instant premiumEndsAt,
            /**
             * Nguồn quyền hiện tại: PAID (đã mua), TRIAL (còn dùng thử theo ngày
             * tạo tài khoản), EXPIRED (hết, phải trả phí).
             *
             * <p>premiumActive không đủ để phân biệt PAID với TRIAL, mà đó lại là
             * thứ admin cần biết khi đối soát doanh thu.
             */
            AccessState accessState,
            /** Hạn dùng thử; null khi đã mua hoặc đã hết dùng thử. */
            Instant trialEndsAt,
            Instant createdAt,
            /** Lần cuối NHẬP mật khẩu / bấm Google. */
            Instant lastLoginAt,
            /**
             * Lần cuối còn ở web. Suy từ thời điểm phát refresh token gần nhất,
             * nên phản ánh cả những phiên vào lại mà không phải đăng nhập —
             * refresh token sống 30 ngày.
             */
            Instant lastActivityAt) {
    }

    /**
     * Cách sắp xếp danh sách tài khoản.
     *
     * <p>ACTIVITY_DESC/ASC sắp theo lần cuối còn ở web. Cột đó không có trong
     * bảng users (nó là MAX(refresh_tokens.created_at)) nên phải sắp bằng
     * subquery tương quan, xem AdminUserService#applyOrder.
     */
    public enum UserSort {
        /** Mới đăng ký trước — mặc định. */
        CREATED_DESC,
        CREATED_ASC,
        /** Vừa vào web gần đây nhất trước. */
        ACTIVITY_DESC,
        /** Lâu không vào nhất trước — để tìm người bỏ học. */
        ACTIVITY_ASC
    }

    /**
     * Khoảng lọc theo lần cuối còn ở web.
     *
     * <p>Lũy tiến, không phải các khoảng rời nhau: LAST_7_DAYS gồm cả người vào
     * hôm nay. Admin cần "ai còn hoạt động trong tuần", không phải "ai vào tuần
     * trước mà không vào tuần này".
     */
    public enum ActivityWindow {
        TODAY,
        LAST_7_DAYS,
        LAST_30_DAYS,
        /** Quá 30 ngày không vào — gồm cả người chưa từng đăng nhập. */
        INACTIVE,
        /** Chưa từng có phiên nào: đăng ký rồi bỏ luôn. */
        NEVER
    }

    /** Nguồn quyền truy cập nội dung của một tài khoản. */
    public enum AccessState {
        PAID,
        TRIAL,
        EXPIRED
    }

    public record AdminRoleResponse(String code, String name, String description) {
    }

    public record UpdateStatusRequest(@NotNull UserStatus status) {
    }

    public record UpdateRolesRequest(@NotEmpty Set<String> roles) {
    }
}
