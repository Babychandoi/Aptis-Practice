package vn.weconex.aptis.auth.web;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import vn.weconex.aptis.common.util.Enums.CefrLevel;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 128) String password,
            @Size(max = 255) String fullName) {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password,
            @Size(max = 255) String deviceId) {
    }

    /** refreshToken chỉ còn dùng để chuyển tiếp phiên cũ đang lưu token trong localStorage. */
    public record RefreshRequest(String refreshToken) {
    }

    public record LogoutRequest(
            String refreshToken,
            /** true = thu hồi mọi refresh token của user (đăng xuất tất cả thiết bị) */
            boolean allDevices) {
    }

    public record VerifyEmailRequest(@NotBlank String token) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    public record ResendVerificationRequest(@NotBlank @Email String email) {
    }

    /** Cấu hình cho trình duyệt: rỗng nghĩa là chưa bật đăng nhập Google. */
    public record AuthConfigResponse(String googleClientId) {
    }

    /** ID token do Google Identity Services trả về ở phía trình duyệt. */
    public record GoogleLoginRequest(
            @NotBlank String idToken,
            String deviceId) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 128) String newPassword) {
    }

    public record TokenResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            long expiresInSeconds,
            Instant accessTokenExpiresAt) {

        public static TokenResponse of(
                String accessToken, String refreshToken, long expiresIn, Instant expiresAt) {
            return new TokenResponse(accessToken, refreshToken, "Bearer", expiresIn, expiresAt);
        }

        /** Refresh token chỉ được gửi qua cookie HttpOnly, không xuất hiện trong JSON. */
        public TokenResponse withoutRefreshToken() {
            return new TokenResponse(accessToken, null, tokenType, expiresInSeconds, accessTokenExpiresAt);
        }
    }

    public record MeResponse(
            String id,
            String email,
            String status,
            Set<String> roles,
            Set<String> permissions,
            boolean emailVerified,
            ProfileResponse profile,
            /** Trạng thái Premium đọc từ entitlement tại thời điểm gọi API */
            boolean premiumActive,
            Instant premiumEndsAt) {
    }

    public record ProfileResponse(
            String fullName,
            String displayName,
            String avatarUrl,
            LocalDate dateOfBirth,
            String gender,
            CefrLevel targetCefrLevel,
            LocalDate targetExamDate,
            String timezone,
            String locale) {
    }

    public record UpdateProfileRequest(
            @Size(max = 255) String fullName,
            @Size(max = 100) String displayName,
            LocalDate dateOfBirth,
            String gender,
            CefrLevel targetCefrLevel,
            LocalDate targetExamDate,
            @Size(max = 50) String timezone,
            @Size(max = 20) String locale) {
    }
}
