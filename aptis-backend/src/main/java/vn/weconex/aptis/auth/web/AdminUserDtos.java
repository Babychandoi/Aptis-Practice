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
