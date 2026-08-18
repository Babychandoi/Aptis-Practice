package vn.weconex.aptis.auth.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.Duration;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import vn.weconex.aptis.common.config.AptisProperties;

@ExtendWith(MockitoExtension.class)
class RefreshTokenCookieServiceTest {

    @Mock
    private AptisProperties properties;

    private RefreshTokenCookieService service;

    @BeforeEach
    void setUp() {
        AptisProperties.RefreshCookie cookie = new AptisProperties.RefreshCookie(
                "aptis_refresh", true, "Lax", "");
        when(properties.refreshCookie()).thenReturn(cookie);
        service = new RefreshTokenCookieService(properties);
    }

    @Test
    void writesHttpOnlyScopedRefreshCookie() {
        AptisProperties.Jwt jwt = new AptisProperties.Jwt(
                "secret", "issuer", Duration.ofMinutes(15), Duration.ofDays(30));
        when(properties.jwt()).thenReturn(jwt);
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.write(response, "raw-token");

        String header = response.getHeader("Set-Cookie");
        assertThat(header)
                .contains("aptis_refresh=raw-token")
                .contains("Path=/api/v1/auth")
                .contains("Max-Age=2592000")
                .contains("Secure")
                .contains("HttpOnly")
                .contains("SameSite=Lax");
    }

    @Test
    void cookieTakesPrecedenceAndLegacyBodyIsFallback() {
        MockHttpServletRequest withCookie = new MockHttpServletRequest();
        withCookie.setCookies(new Cookie("aptis_refresh", "cookie-token"));

        assertThat(service.resolve(withCookie, "legacy-token")).isEqualTo("cookie-token");
        assertThat(service.resolve(new MockHttpServletRequest(), "legacy-token"))
                .isEqualTo("legacy-token");
    }

    @Test
    void clearExpiresTheSameCookiePath() {
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.clear(response);

        assertThat(response.getHeader("Set-Cookie"))
                .contains("aptis_refresh=")
                .contains("Path=/api/v1/auth")
                .contains("Max-Age=0");
    }
}
