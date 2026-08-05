package vn.weconex.aptis.platform.realtime;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Kênh đẩy sự kiện xuống trình duyệt qua SSE.
 *
 * <p>Dùng để tài khoản được nâng cấp là giao diện đổi ngay, không phải F5 hay
 * đăng xuất đăng nhập lại.
 *
 * <p>Lưu kết nối trong bộ nhớ của từng instance. Chạy nhiều instance backend
 * thì người dùng nối vào instance A sẽ không nhận sự kiện phát từ instance B —
 * khi đó cần Redis pub/sub. Hiện tại một instance nên chưa cần; frontend vẫn có
 * lớp dự phòng gọi lại {@code /me} nên mất sự kiện chỉ chậm chứ không sai.
 */
@Slf4j
@Component
public class UserEventStream {

    /** Một người có thể mở nhiều tab, mỗi tab một kết nối. */
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String userId, long timeoutMillis) {
        SseEmitter emitter = new SseEmitter(timeoutMillis);

        emitters.computeIfAbsent(userId, key -> new CopyOnWriteArrayList<>()).add(emitter);

        // Dọn khi tab đóng, hết hạn hoặc mạng đứt — không dọn thì map phình mãi
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(ex -> remove(userId, emitter));

        try {
            // Gửi ngay một sự kiện để trình duyệt biết kênh đã mở; proxy nào
            // đệm response cũng bị đẩy đi luôn.
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException ex) {
            remove(userId, emitter);
        }

        return emitter;
    }

    /**
     * Đẩy sự kiện tới mọi tab của một người.
     *
     * <p>Không ném lỗi ra ngoài: gửi thất bại chỉ nghĩa là kết nối đó chết,
     * không được làm hỏng nghiệp vụ đang chạy.
     */
    public void publish(String userId, String eventName, Object payload) {
        List<SseEmitter> targets = emitters.get(userId);
        if (targets == null || targets.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : targets) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(payload));
            } catch (Exception ex) {
                remove(userId, emitter);
            }
        }
    }

    /** Số kết nối đang mở — dùng cho kiểm thử và chẩn đoán. */
    public int connectionCount(String userId) {
        List<SseEmitter> list = emitters.get(userId);
        return list == null ? 0 : list.size();
    }

    private void remove(String userId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(userId);
        if (list == null) {
            return;
        }
        list.remove(emitter);
        if (list.isEmpty()) {
            emitters.remove(userId);
        }
    }
}
