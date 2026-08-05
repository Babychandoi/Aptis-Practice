package vn.weconex.aptis.platform.outbox;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.common.config.AptisProperties;

/**
 * Phát outbox event tới handler tương ứng.
 *
 * <p>Không có transaction ở tầng này: mỗi event được đánh dấu PUBLISHED hoặc
 * FAILED trong transaction riêng, nên một event lỗi không chặn các event khác.
 *
 * <p>Tách khỏi {@link OutboxService} vì lời gọi method {@code @Transactional}
 * trong cùng bean sẽ bỏ qua proxy Spring — cùng lý do
 * {@code EvaluationDispatcher} tách khỏi worker.
 */
@Slf4j
@Service
public class OutboxDispatcher {

    private static final TypeReference<Map<String, Object>> PAYLOAD_TYPE =
            new TypeReference<>() { };

    private final OutboxService outboxService;
    private final OutboxStatusWriter statusWriter;
    private final ObjectMapper objectMapper;
    private final Map<String, OutboxEventHandler> handlers;
    private final int maxRetry;

    public OutboxDispatcher(
            OutboxService outboxService,
            OutboxStatusWriter statusWriter,
            ObjectMapper objectMapper,
            List<OutboxEventHandler> handlerList,
            AptisProperties properties) {

        this.outboxService = outboxService;
        this.statusWriter = statusWriter;
        this.objectMapper = objectMapper;
        this.handlers = handlerList.stream()
                .collect(Collectors.toMap(OutboxEventHandler::eventType, Function.identity()));
        this.maxRetry = properties.outbox().maxRetry();

        log.info("Đã nạp {} outbox handler: {}", handlers.size(), handlers.keySet());
    }

    /**
     * @return số event đã phát thành công
     */
    public int dispatchBatch(int batchSize) {
        List<OutboxEvent> pending = outboxService.claimPending(batchSize);
        if (pending.isEmpty()) {
            return 0;
        }

        int published = 0;
        for (OutboxEvent event : pending) {
            if (dispatchOne(event)) {
                published++;
            }
        }
        return published;
    }

    private boolean dispatchOne(OutboxEvent event) {
        OutboxEventHandler handler = handlers.get(event.getEventType());

        // Không có handler không phải lỗi: event vẫn hữu ích để đối soát, và
        // handler có thể được thêm sau. Đánh dấu PUBLISHED để không retry mãi.
        if (handler == null) {
            log.debug("Không có handler cho event {}, bỏ qua", event.getEventType());
            statusWriter.markPublished(event.getId());
            return false;
        }

        try {
            Map<String, Object> payload =
                    objectMapper.readValue(event.getPayloadJson(), PAYLOAD_TYPE);

            handler.handle(event.getAggregateId(), payload);
            statusWriter.markPublished(event.getId());
            return true;

        } catch (Exception ex) {
            statusWriter.markFailed(event.getId(), ex.getMessage(), maxRetry);
            log.warn("Outbox event {} ({}) thất bại: {}",
                    event.getId(), event.getEventType(), ex.getMessage());
            return false;
        }
    }
}
