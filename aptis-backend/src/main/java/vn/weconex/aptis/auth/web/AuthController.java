package vn.weconex.aptis.auth.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.service.AuthService;
import vn.weconex.aptis.common.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        authService.register(request);
    }

    @PostMapping("/verify-email")
    public void verifyEmail(@Valid @RequestBody AuthDtos.VerifyEmailRequest request) {
        authService.verifyEmail(request.token());
    }

    @PostMapping("/login")
    public AuthDtos.TokenResponse login(
            @Valid @RequestBody AuthDtos.LoginRequest request,
            HttpServletRequest httpRequest) {

        return authService.login(request, httpRequest.getHeader("User-Agent"), clientIp(httpRequest));
    }

    @PostMapping("/refresh")
    public AuthDtos.TokenResponse refresh(
            @Valid @RequestBody AuthDtos.RefreshRequest request,
            HttpServletRequest httpRequest) {

        return authService.refresh(
                request.refreshToken(), httpRequest.getHeader("User-Agent"), clientIp(httpRequest));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestBody AuthDtos.LogoutRequest request) {
        authService.logout(currentUser.requireUserId(), request);
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
