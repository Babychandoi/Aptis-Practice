package vn.weconex.aptis.common.security;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.weconex.aptis.common.exception.ApiErrorResponse;
import vn.weconex.aptis.common.exception.ApiException;

/**
 * Đọc Bearer token, dựng {@link AuthPrincipal} vào SecurityContext.
 * Request không có header vẫn đi tiếp — endpoint public tự cho phép,
 * endpoint bảo vệ sẽ bị chặn ở tầng authorization.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    /** Đường dẫn duy nhất được phép nhận token qua query param. */
    private static final String SSE_PATH = "/api/v1/events";

    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {

        String token = extractToken(request);
        if (token == null) {
            chain.doFilter(request, response);
            return;
        }
        try {
            JwtService.ParsedToken parsed = jwtService.parse(token);
            AuthPrincipal principal =
                    new AuthPrincipal(parsed.userId(), parsed.roles(), parsed.permissions());

            List<GrantedAuthority> authorities = new ArrayList<>();
            parsed.roles().forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
            parsed.permissions().forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));

            var authentication =
                    new UsernamePasswordAuthenticationToken(principal, token, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (ApiException ex) {
            // Token có nhưng sai/hết hạn: trả lỗi ngay để client biết cần refresh
            SecurityContextHolder.clearContext();
            writeError(response, ex, request.getRequestURI());
            return;
        }

        chain.doFilter(request, response);
    }

    /**
     * Lấy token từ header, hoặc từ query param cho riêng kênh SSE.
     *
     * <p>{@code EventSource} của trình duyệt không gửi được header tùy chỉnh
     * nên buộc phải nhận qua query. Giới hạn đúng một đường dẫn: token trên URL
     * bị ghi vào access log của proxy và nằm trong lịch sử trình duyệt, không
     * nên mở cho mọi endpoint.
     */
    private static String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length()).trim();
        }

        if (SSE_PATH.equals(request.getRequestURI())) {
            String param = request.getParameter("access_token");
            if (param != null && !param.isBlank()) {
                return param.strip();
            }
        }
        return null;
    }

    private void writeError(HttpServletResponse response, ApiException ex, String path)
            throws IOException {

        response.setStatus(ex.code().status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(
                response.getWriter(),
                ApiErrorResponse.of(ex.code(), ex.getMessage(), ex.details(), path));
    }
}
