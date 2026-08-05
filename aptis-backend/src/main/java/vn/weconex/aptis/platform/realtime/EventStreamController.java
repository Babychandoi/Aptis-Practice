package vn.weconex.aptis.platform.realtime;

import java.time.Duration;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import vn.weconex.aptis.common.security.CurrentUser;

/**
 * Kênh SSE để giao diện cập nhật ngay khi quyền thay đổi.
 *
 * <p>Trình duyệt dùng {@code EventSource}, không gửi được header nên token
 * truyền qua query {@code access_token} — chỉ đường dẫn này được phép, xem
 * {@code JwtAuthenticationFilter}.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class EventStreamController {

    /**
     * Đóng kết nối sau 30 phút để giải phóng thread; trình duyệt tự nối lại.
     * Để vô hạn thì tab bỏ quên sẽ giữ thread mãi.
     */
    private static final long STREAM_TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    private final UserEventStream eventStream;
    private final CurrentUser currentUser;

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return eventStream.subscribe(currentUser.requireUserId(), STREAM_TIMEOUT_MS);
    }
}
