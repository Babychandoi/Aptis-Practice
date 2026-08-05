package vn.weconex.aptis.platform.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ghi trạng thái outbox event trong transaction độc lập.
 *
 * <p>{@code REQUIRES_NEW} là bắt buộc cho {@link #markFailed}: nếu handler ném
 * exception trong transaction chung thì lệnh ghi trạng thái cũng bị rollback,
 * event mãi ở PENDING với retry_count = 0 và bị xử lý lại vô hạn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxStatusWriter {

    private final OutboxEventRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPublished(String eventId) {
        repository.findById(eventId).ifPresent(event -> {
            event.markPublished();
            repository.save(event);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String eventId, String error, int maxRetry) {
        repository.findById(eventId).ifPresent(event -> {
            event.markFailed(truncate(error), maxRetry);
            repository.save(event);

            if (event.getStatus() == vn.weconex.aptis.common.util.Enums.OutboxStatus.FAILED) {
                // Hết lượt retry: cần người xử lý, không tự phục hồi được
                log.error("Outbox event {} ({}) đã FAILED sau {} lần thử: {}",
                        eventId, event.getEventType(), event.getRetryCount(), error);
            }
        });
    }

    private static String truncate(String error) {
        if (error == null) {
            return "Lỗi không rõ";
        }
        return error.length() <= 1000 ? error : error.substring(0, 1000);
    }
}
