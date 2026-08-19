package vn.weconex.aptis.common.websocket;

import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service phát sự kiện thời gian thực tới giao diện quản trị viên qua WebSocket.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminEventPublisher {

    private final AdminWebSocketHandler webSocketHandler;

    /**
     * Thông báo học viên vừa bấm "Tôi đã chuyển khoản".
     */
    public void publishBankTransferClaimed(
            String transferId, String transferCode, String orderCode, long amount, String userEmail, String claimNote) {
        log.info("Phát WebSocket event BANK_TRANSFER_CLAIMED: mã CK={}", transferCode);
        webSocketHandler.broadcast("BANK_TRANSFER_CLAIMED", Map.of(
                "transferId", transferId != null ? transferId : "",
                "transferCode", transferCode != null ? transferCode : "",
                "orderCode", orderCode != null ? orderCode : "",
                "amount", amount,
                "userEmail", userEmail != null ? userEmail : "",
                "claimNote", claimNote != null ? claimNote : "",
                "message", "Học viên vừa báo đã chuyển khoản: " + transferCode
        ));
    }

    /**
     * Thông báo yêu cầu chuyển khoản đã được xác nhận.
     */
    public void publishBankTransferConfirmed(
            String transferId, String transferCode, String orderCode, long amount) {
        log.info("Phát WebSocket event BANK_TRANSFER_CONFIRMED: mã CK={}", transferCode);
        webSocketHandler.broadcast("BANK_TRANSFER_CONFIRMED", Map.of(
                "transferId", transferId != null ? transferId : "",
                "transferCode", transferCode != null ? transferCode : "",
                "orderCode", orderCode != null ? orderCode : "",
                "amount", amount,
                "message", "Đã xác nhận thanh toán mã CK: " + transferCode
        ));
    }

    /**
     * Thông báo yêu cầu chuyển khoản đã bị từ chối.
     */
    public void publishBankTransferRejected(
            String transferId, String transferCode, String orderCode, String reason) {
        log.info("Phát WebSocket event BANK_TRANSFER_REJECTED: mã CK={}", transferCode);
        webSocketHandler.broadcast("BANK_TRANSFER_REJECTED", Map.of(
                "transferId", transferId != null ? transferId : "",
                "transferCode", transferCode != null ? transferCode : "",
                "orderCode", orderCode != null ? orderCode : "",
                "reason", reason != null ? reason : "",
                "message", "Đã từ chối mã CK: " + transferCode
        ));
    }

    /**
     * Phát sự kiện tuỳ biến tới Admin.
     */
    public void publish(String eventType, Object payload) {
        webSocketHandler.broadcast(eventType, payload);
    }
}
