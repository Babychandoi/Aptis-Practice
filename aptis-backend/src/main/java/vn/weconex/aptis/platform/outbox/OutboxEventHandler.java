package vn.weconex.aptis.platform.outbox;

import java.util.Map;

/**
 * Xử lý một loại outbox event.
 *
 * <p>Handler phải **idempotent**: outbox bảo đảm at-least-once, nên cùng một
 * event có thể được xử lý lại sau khi worker chết giữa lúc gửi và lúc ghi
 * PUBLISHED.
 *
 * <p>Ném exception để báo thất bại — dispatcher sẽ retry với backoff luỹ tiến.
 */
public interface OutboxEventHandler {

    /** Giá trị khớp {@code outbox_events.event_type}. */
    String eventType();

    void handle(String aggregateId, Map<String, Object> payload);
}
