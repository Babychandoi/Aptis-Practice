package vn.weconex.aptis.common.websocket;

import java.net.URI;
import java.util.Map;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;
import vn.weconex.aptis.common.security.JwtService;

/**
 * Đăng ký endpoint WebSocket và xác thực quyền Quản trị viên trong bước Handshake.
 */
@Slf4j
@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final AdminWebSocketHandler adminWebSocketHandler;
    private final JwtService jwtService;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(adminWebSocketHandler, "/ws/admin/bank-transfers", "/ws/admin/events")
                .setAllowedOriginPatterns("*")
                .addInterceptors(new AdminAuthHandshakeInterceptor(jwtService));
    }

    @RequiredArgsConstructor
    private static class AdminAuthHandshakeInterceptor implements HandshakeInterceptor {

        private final JwtService jwtService;

        private static final Set<String> ALLOWED_ROLES = Set.of(
                "ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_FINANCE", "ROLE_SUPPORT",
                "ROLE_CONTENT_EDITOR", "ROLE_CONTENT_REVIEWER", "ROLE_TEACHER"
        );

        @Override
        public boolean beforeHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler wsHandler,
                Map<String, Object> attributes) {

            URI uri = request.getURI();
            String query = uri.getQuery();
            String token = null;

            if (query != null && !query.isBlank()) {
                for (String param : query.split("&")) {
                    String[] pair = param.split("=", 2);
                    if (pair.length == 2 && "token".equalsIgnoreCase(pair[0].trim())) {
                        token = pair[1].trim();
                        break;
                    }
                }
            }

            if (token == null || token.isBlank()) {
                log.warn("WebSocket handshake bị từ chối: Thiếu token");
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            try {
                JwtService.ParsedToken parsed = jwtService.parse(token);
                boolean hasAdminRole = parsed.roles().stream().anyMatch(ALLOWED_ROLES::contains);
                boolean hasAdminPerm = parsed.permissions().contains("order:read")
                        || parsed.permissions().contains("plan:write");

                if (!hasAdminRole && !hasAdminPerm) {
                    log.warn("WebSocket handshake bị từ chối: User {} không có quyền admin", parsed.userId());
                    response.setStatusCode(HttpStatus.FORBIDDEN);
                    return false;
                }

                attributes.put("userId", parsed.userId());
                attributes.put("roles", parsed.roles());
                attributes.put("permissions", parsed.permissions());
                return true;
            } catch (Exception ex) {
                log.warn("WebSocket handshake thất bại: Token không hợp lệ ({})", ex.getMessage());
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }
        }

        @Override
        public void afterHandshake(
                ServerHttpRequest request,
                ServerHttpResponse response,
                WebSocketHandler wsHandler,
                Exception exception) {
            // Không cần xử lý gì thêm sau handshake
        }
    }
}
