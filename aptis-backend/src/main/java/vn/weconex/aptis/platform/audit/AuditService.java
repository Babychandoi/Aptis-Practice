package vn.weconex.aptis.platform.audit;

import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ghi nhật ký quản trị.
 *
 * <p>Ghi trong cùng transaction nghiệp vụ: nếu nghiệp vụ rollback thì audit
 * cũng mất — đúng ý đồ, vì không nên có log của việc chưa xảy ra.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void record(
            String actorUserId,
            String action,
            String resourceType,
            String resourceId,
            Map<String, Object> before,
            Map<String, Object> after) {

        AuditLog entry = new AuditLog();
        entry.setActorUserId(actorUserId);
        entry.setAction(action);
        entry.setResourceType(resourceType);
        entry.setResourceId(resourceId);
        entry.setBeforeJson(toJson(before));
        entry.setAfterJson(toJson(after));
        repository.save(entry);
    }

    /**
     * Lỗi serialize không được làm vỡ nghiệp vụ — audit là thông tin phụ trợ.
     */
    private String toJson(Map<String, Object> value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            log.warn("Không serialize được payload audit: {}", ex.getMessage());
            return null;
        }
    }
}
