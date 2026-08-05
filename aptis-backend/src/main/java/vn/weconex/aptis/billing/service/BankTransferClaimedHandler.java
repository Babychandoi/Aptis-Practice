package vn.weconex.aptis.billing.service;

import java.util.Map;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.platform.notification.NotificationSender;
import vn.weconex.aptis.platform.outbox.OutboxEventHandler;

/**
 * Báo quản trị khi học viên khai đã chuyển khoản.
 *
 * <p>Đi qua outbox để lỗi SMTP không làm hỏng thao tác của học viên, và để có
 * retry — mất email này nghĩa là đơn nằm chờ mà không ai biết.
 */
@Slf4j
@Component
public class BankTransferClaimedHandler implements OutboxEventHandler {

    private final NotificationSender notificationSender;
    private final String adminEmail;

    public BankTransferClaimedHandler(
            NotificationSender notificationSender,
            @Value("${aptis.billing.transfer-notify-email:}") String adminEmail) {
        this.notificationSender = notificationSender;
        this.adminEmail = adminEmail;

        if (adminEmail.isBlank()) {
            log.warn("Chưa đặt aptis.billing.transfer-notify-email — sẽ không có "
                    + "email báo khi học viên chuyển khoản, phải tự vào admin kiểm tra");
        }
    }

    @Override
    public String eventType() {
        return "BANK_TRANSFER_CLAIMED";
    }

    @Override
    public void handle(String aggregateId, Map<String, Object> payload) {
        if (adminEmail.isBlank()) {
            // Không cấu hình người nhận thì không có gì để retry
            log.warn("Bỏ qua thông báo chuyển khoản {}: chưa cấu hình email nhận",
                    aggregateId);
            return;
        }

        notificationSender.sendBankTransferClaimed(
                adminEmail,
                asString(payload.get("transferCode")),
                asString(payload.get("orderCode")),
                asLong(payload.get("amount")));
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? 0L : Long.parseLong(value.toString());
        } catch (NumberFormatException ex) {
            return 0L;
        }
    }
}
