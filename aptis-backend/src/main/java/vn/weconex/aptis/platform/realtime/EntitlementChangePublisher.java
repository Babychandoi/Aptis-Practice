package vn.weconex.aptis.platform.realtime;

import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Báo cho trình duyệt biết quyền của người dùng vừa đổi.
 *
 * <p>Phát SAU KHI transaction commit là bắt buộc: phát trong transaction thì
 * trình duyệt gọi lại {@code /me} ngay và đọc phải dữ liệu cũ (chưa commit),
 * thấy vẫn chưa có Premium — đúng cái lỗi mà tính năng này sinh ra để tránh.
 * Tệ hơn, transaction rollback thì đã lỡ báo nâng cấp thành công.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EntitlementChangePublisher {

    public static final String EVENT_ENTITLEMENT_CHANGED = "entitlement-changed";

    private final UserEventStream eventStream;

    /**
     * @param reason lý do đổi quyền, để giao diện hiện thông báo phù hợp
     *     (vd "PAYMENT_CONFIRMED", "ADMIN_GRANT", "REVOKED")
     */
    public void publishAfterCommit(String userId, String reason) {
        if (userId == null) {
            return;
        }

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // Không có transaction (gọi từ job, hoặc method không @Transactional)
            // thì phát luôn.
            send(userId, reason);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        send(userId, reason);
                    }
                });
    }

    private void send(String userId, String reason) {
        try {
            eventStream.publish(userId, EVENT_ENTITLEMENT_CHANGED,
                    Map.of("reason", reason == null ? "" : reason));
        } catch (Exception ex) {
            // Đẩy realtime hỏng không được ảnh hưởng nghiệp vụ đã commit xong
            log.warn("Không đẩy được sự kiện đổi quyền cho {}: {}", userId, ex.getMessage());
        }
    }
}
