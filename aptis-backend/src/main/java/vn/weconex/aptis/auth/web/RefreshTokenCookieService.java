package vn.weconex.aptis.auth.web;

import java.time.Duration;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.config.AptisProperties;

/** Đọc/ghi refresh token bằng cookie HttpOnly, giới hạn trong nhóm endpoint auth. */
@Component
@RequiredArgsConstructor
public class RefreshTokenCookieService {

    private static final String COOKIE_PATH = "/api/v1/auth";

    private final AptisProperties properties;

    public String resolve(HttpServletRequest request, String legacyBodyToken) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookieName().equals(cookie.getName())
                        && cookie.getValue() != null
                        && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }
        return legacyBodyToken == null || legacyBodyToken.isBlank() ? null : legacyBodyToken;
    }

    public void write(HttpServletResponse response, String rawRefreshToken) {
        add(response, cookie(rawRefreshToken, properties.jwt().refreshTokenTtl()));
    }

    public void clear(HttpServletResponse response) {
        add(response, cookie("", Duration.ZERO));
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        AptisProperties.RefreshCookie config = properties.refreshCookie();
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(cookieName(), value)
                .httpOnly(true)
                .secure(config.secure())
                .sameSite(config.sameSite())
                .path(COOKIE_PATH)
                .maxAge(maxAge);
        if (config.domain() != null && !config.domain().isBlank()) {
            builder.domain(config.domain());
        }
        return builder.build();
    }

    private String cookieName() {
        String configured = properties.refreshCookie().name();
        return configured == null || configured.isBlank() ? "aptis_refresh" : configured;
    }

    private static void add(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
