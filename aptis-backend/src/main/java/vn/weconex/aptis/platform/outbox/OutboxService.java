package vn.weconex.aptis.platform.outbox;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.util.Enums.OutboxStatus;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxEventRepository repository;
    private final ObjectMapper objectMapper;

    /**
     * Ghi event trong transaction hiện tại. Nếu transaction rollback thì event
     * cũng mất — đúng ý đồ: event chỉ tồn tại khi nghiệp vụ đã commit.
     */
    @Transactional
    public OutboxEvent publish(
            String aggregateType, String aggregateId, String eventType, Map<String, Object> payload) {

        OutboxEvent event = new OutboxEvent();
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setEventType(eventType);
        event.setPayloadJson(serialize(payload));
        return repository.save(event);
    }

    @Transactional(readOnly = true)
    public List<OutboxEvent> claimPending(int batchSize) {
        return repository.findPending(
                OutboxStatus.PENDING, Instant.now(), PageRequest.of(0, batchSize));
    }

    private String serialize(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Không serialize được payload outbox", ex);
        }
    }
}
