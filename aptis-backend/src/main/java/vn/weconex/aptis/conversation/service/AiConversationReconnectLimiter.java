package vn.weconex.aptis.conversation.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/** Separate retry budget: failed transport attempts must not consume the room-creation limit. */
@Component
public class AiConversationReconnectLimiter {
    private final Map<String, Window> windows = new HashMap<>();

    public synchronized void acquire(String userId, Instant now) {
        windows.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
        Window window = windows.get(userId);
        if (window != null && window.count() >= 12) {
            long retryAfter = Math.max(1, window.expiresAt().getEpochSecond() - now.getEpochSecond());
            throw new ApiException(ErrorCode.RATE_LIMITED, "Đang khôi phục kết nối, vui lòng chờ một chút.",
                    Map.of("retryAfterSeconds", retryAfter));
        }
        if (window == null && windows.size() >= 10000) {
            throw new ApiException(ErrorCode.RATE_LIMITED, "Máy chủ đang bận, vui lòng thử lại.");
        }
        windows.put(userId, window == null ? new Window(now.plusSeconds(60), 1)
                : new Window(window.expiresAt(), window.count() + 1));
    }

    private record Window(Instant expiresAt, int count) {}
}
