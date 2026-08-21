package vn.weconex.aptis.auth.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.service.AuthService;
import vn.weconex.aptis.auth.service.GoogleTokenVerifier;
import vn.weconex.aptis.common.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final CurrentUser currentUser;
    private final RefreshTokenCookieService refreshTokenCookies;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        authService.register(request);
    }

    @PostMapping("/verify-email")
    public void verifyEmail(@Valid @RequestBody AuthDtos.VerifyEmailRequest request) {
        authService.verifyEmail(request.token());
    }

    /**
     * Gửi lại email xác thực. Luôn trả 202 dù email không tồn tại, đã xác thực
     * rồi, hay bị chặn vì gửi quá nhiều — không tiết lộ email nào đã đăng ký.
     */
    @PostMapping("/resend-verification")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resendVerification(
            @Valid @RequestBody AuthDtos.ResendVerificationRequest request) {
        authService.resendVerificationEmail(request.email());
    }

    @PostMapping("/login")
    public AuthDtos.TokenResponse login(
            @Valid @RequestBody AuthDtos.LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        AuthDtos.TokenResponse tokens = authService.login(
                request, httpRequest.getHeader("User-Agent"), clientIp(httpRequest));
        refreshTokenCookies.write(httpResponse, tokens.refreshToken());
        return tokens.withoutRefreshToken();
    }

    /**
     * Cấu hình đăng nhập ngoài cho trình duyệt.
     *
     * <p>Client ID của Google không phải bí mật (nó nằm trong mã trang khi khởi
     * tạo nút Google), nhưng trả qua API thay vì nhúng lúc build để đổi Client
     * ID chỉ cần sửa .env và khởi động lại backend — không phải build lại
     * frontend.
     */
    @GetMapping("/config")
    public AuthDtos.AuthConfigResponse config() {
        return new AuthDtos.AuthConfigResponse(googleTokenVerifier.clientId());
    }

    /**
     * Đăng nhập bằng Google. Trả về cùng dạng token như {@code /login}, kể cả
     * cookie refresh — phía client sau đó không cần biết đã đăng nhập bằng cách
     * nào.
     */
    @PostMapping("/google")
    public AuthDtos.TokenResponse googleLogin(
            @Valid @RequestBody AuthDtos.GoogleLoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        AuthDtos.TokenResponse tokens = authService.loginWithGoogle(
                request.idToken(),
                request.deviceId(),
                httpRequest.getHeader("User-Agent"),
                clientIp(httpRequest));
        refreshTokenCookies.write(httpResponse, tokens.refreshToken());
        return tokens.withoutRefreshToken();
    }

    @PostMapping("/refresh")
    public AuthDtos.TokenResponse refresh(
            @RequestBody(required = false) AuthDtos.RefreshRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        String legacyToken = request == null ? null : request.refreshToken();
        String refreshToken = refreshTokenCookies.resolve(httpRequest, legacyToken);
        AuthDtos.TokenResponse tokens = authService.refresh(
                refreshToken, httpRequest.getHeader("User-Agent"), clientIp(httpRequest));
        refreshTokenCookies.write(httpResponse, tokens.refreshToken());
        return tokens.withoutRefreshToken();
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @RequestBody(required = false) AuthDtos.LogoutRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthDtos.LogoutRequest body = request == null
                ? new AuthDtos.LogoutRequest(null, false) : request;
        String refreshToken = refreshTokenCookies.resolve(httpRequest, body.refreshToken());
        authService.logout(currentUser.requireUserId(),
                new AuthDtos.LogoutRequest(refreshToken, body.allDevices()));
        refreshTokenCookies.clear(httpResponse);
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
    }

    @PostMapping("/reset-password")
    public void resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        authService.resetPassword(request);
    }

    /**
     * X-Forwarded-For có thể chứa danh sách khi qua nhiều proxy; lấy IP đầu tiên.
     */
    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }
}
