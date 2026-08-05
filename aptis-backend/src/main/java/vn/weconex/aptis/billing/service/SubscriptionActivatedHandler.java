package vn.weconex.aptis.billing.service;

import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.platform.notification.NotificationSender;
import vn.weconex.aptis.platform.outbox.OutboxEventHandler;

/**
 * Gửi thông báo khi Premium được kích hoạt (PHẦN IV §34 bước 9).
 *
 * <p>Chạy qua outbox thay vì gửi trực tiếp trong luồng webhook: gửi email chậm
 * hoặc lỗi SMTP không được làm webhook trả 500, vì provider sẽ retry và có thể
 * gây kích hoạt trùng.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SubscriptionActivatedHandler implements OutboxEventHandler {

    private final UserRepository userRepository;
    private final NotificationSender notificationSender;

    @Override
    public String eventType() {
        return "SUBSCRIPTION_ACTIVATED";
    }

    @Override
    public void handle(String aggregateId, Map<String, Object> payload) {
        String userId = asString(payload.get("userId"));
        if (userId == null) {
            // Payload thiếu userId: không retry được, coi như xử lý xong
            log.warn("Event SUBSCRIPTION_ACTIVATED {} thiếu userId", aggregateId);
            return;
        }

        String email = userRepository.findById(userId)
                .map(user -> user.getEmail())
                .orElse(null);

        if (email == null) {
            log.warn("Không tìm thấy user {} để gửi thông báo Premium", userId);
            return;
        }

        notificationSender.sendPremiumActivated(
                email,
                asString(payload.get("planCode")),
                asString(payload.get("endsAt")));
    }

    private static String asString(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString();
        return text.isBlank() ? null : text;
    }
}
