package vn.weconex.aptis.common.websocket;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * Quản lý các kết nối WebSocket thời gian thực của Quản trị viên.
 *
 * <p>Nhận và phát thông điệp hai chiều, xử lý heartbeat ping/pong và phát (broadcast)
 * sự kiện tới tất cả admin đang online khi có thay đổi trạng thái đơn hàng/chuyển khoản.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        String userId = (String) session.getAttributes().get("userId");
        log.info("Admin WebSocket connected: sessionId={}, userId={}, totalActive={}",
                session.getId(), userId, sessions.size());

        // Gửi thông điệp chào mừng xác nhận kết nối thành công
        sendDirect(session, Map.of(
                "type", "CONNECTED",
                "timestamp", Instant.now().toString(),
                "message", "Kết nối WebSocket quản trị thành công"
        ));
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload().trim();
        if ("ping".equalsIgnoreCase(payload)) {
            sendDirect(session, Map.of(
                    "type", "PONG",
                    "timestamp", Instant.now().toString()
            ));
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.warn("Lỗi đường truyền WebSocket session {}: {}", session.getId(), exception.getMessage());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("Admin WebSocket disconnected: sessionId={}, status={}, remaining={}",
                session.getId(), status, sessions.size());
    }

    /**
     * Phát thông điệp sự kiện tới tất cả các session Admin đang kết nối.
     */
    public void broadcast(String eventType, Object payload) {
        if (sessions.isEmpty()) {
            log.debug("Không có session Admin nào đang online để nhận event {}", eventType);
            return;
        }

        try {
            Map<String, Object> messageMap = Map.of(
                    "type", eventType,
                    "timestamp", Instant.now().toString(),
                    "payload", payload != null ? payload : Map.of()
            );
            String json = objectMapper.writeValueAsString(messageMap);
            TextMessage textMessage = new TextMessage(json);

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        synchronized (session) {
                            session.sendMessage(textMessage);
                        }
                    } catch (IOException ex) {
                        log.warn("Không gửi được WebSocket tới session {}: {}", session.getId(), ex.getMessage());
                    }
                }
            }
            log.debug("Đã broadcast WebSocket event '{}' tới {} sessions", eventType, sessions.size());
        } catch (Exception ex) {
            log.error("Lỗi đóng gói WebSocket message cho event {}: {}", eventType, ex.getMessage());
        }
    }

    private void sendDirect(WebSocketSession session, Map<String, Object> data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (IOException ex) {
            log.warn("Lỗi gửi tin nhắn trực tiếp tới session {}: {}", session.getId(), ex.getMessage());
        }
    }
}
