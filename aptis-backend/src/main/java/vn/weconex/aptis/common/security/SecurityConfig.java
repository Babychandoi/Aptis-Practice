package vn.weconex.aptis.common.security;

import java.io.IOException;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiErrorResponse;
import vn.weconex.aptis.common.exception.ErrorCode;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final AptisProperties properties;
    private final ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // API stateless dùng Bearer token, không có session cookie để CSRF khai thác
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/v1/auth/register",
                                "/api/v1/auth/verify-email",
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/forgot-password",
                                "/api/v1/auth/reset-password")
                        .permitAll()
                        // Webhook xác thực bằng chữ ký của provider, không dùng JWT
                        .requestMatchers(HttpMethod.POST, "/api/v1/payments/webhooks/**").permitAll()
                        // Danh sách gói để trang bán hàng hiển thị khi chưa đăng nhập
                        .requestMatchers(HttpMethod.GET, "/api/v1/plans").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        .requestMatchers("/api/docs/**", "/api/swagger/**", "/swagger-ui/**").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasAnyRole(
                                "CONTENT_EDITOR", "CONTENT_REVIEWER", "TEACHER",
                                "SUPPORT", "FINANCE", "ADMIN", "SUPER_ADMIN")
                        .anyRequest().authenticated())
                // Không bật httpBasic: API dùng Bearer token, và entry point của
                // Basic Auth biến lỗi thiếu quyền (403) thành 401 kèm
                // "WWW-Authenticate: Basic" với body rỗng — client không biết lý do.
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(restAuthenticationEntryPoint())
                        .accessDeniedHandler(restAccessDeniedHandler()))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(properties.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "X-Request-Id"));
        config.setExposedHeaders(List.of("X-Request-Id"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    /**
     * Argon2id với tham số khuyến nghị của OWASP (m=19MiB, t=2, p=1).
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2PasswordEncoder(16, 32, 1, 19 * 1024, 2);
    }

    /**
     * Chưa đăng nhập hoặc token không hợp lệ → 401 với body JSON thống nhất.
     */
    @Bean
    public AuthenticationEntryPoint restAuthenticationEntryPoint() {
        return (request, response, exception) -> writeError(
                response, request.getRequestURI(),
                ErrorCode.UNAUTHENTICATED, "Chưa đăng nhập");
    }

    /**
     * Đã đăng nhập nhưng thiếu quyền → 403, không phải 401.
     */
    @Bean
    public AccessDeniedHandler restAccessDeniedHandler() {
        return (request, response, exception) -> writeError(
                response, request.getRequestURI(),
                ErrorCode.FORBIDDEN, "Không có quyền truy cập");
    }

    private void writeError(
            HttpServletResponse response, String path, ErrorCode code, String message)
            throws IOException {

        response.setStatus(code.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(
                response.getWriter(), ApiErrorResponse.of(code, message, null, path));
    }
}
