package vn.weconex.aptis.entitlement.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;

/**
 * Kiểm tra quyền dựa trên user_entitlements.
 *
 * <p>Không cache lâu: quyền vừa bị thu hồi phải có hiệu lực ngay (PHẦN VIII §52).
 */
@Service
@RequiredArgsConstructor
public class EntitlementService {

    private final UserEntitlementRepository entitlementRepository;
    private final AptisProperties properties;

    @Transactional(readOnly = true)
    public boolean hasPremiumAccess(String userId) {
        return hasEntitlement(userId, properties.entitlement().premiumCode());
    }

    @Transactional(readOnly = true)
    public boolean hasEntitlement(String userId, String code) {
        return !entitlementRepository.findActive(userId, code, Instant.now()).isEmpty();
    }

    /**
     * Thời điểm quyền Premium hết hiệu lực. {@code Optional.empty()} nghĩa là
     * không có quyền HOẶC quyền vĩnh viễn — dùng cùng {@link #hasPremiumAccess}
     * để phân biệt.
     */
    @Transactional(readOnly = true)
    public Optional<Instant> premiumEndsAt(String userId) {
        List<UserEntitlement> active =
                entitlementRepository.findActive(userId, properties.entitlement().premiumCode(), Instant.now());

        if (active.isEmpty()) {
            return Optional.empty();
        }
        // Query sắp xếp quyền vĩnh viễn (ends_at NULL) lên đầu
        return Optional.ofNullable(active.get(0).getEndsAt());
    }

    @Transactional(readOnly = true)
    public List<UserEntitlement> activeEntitlements(String userId) {
        return entitlementRepository.findAllActive(userId, Instant.now());
    }

    @Transactional
    public UserEntitlement grant(UserEntitlement entitlement) {
        return entitlementRepository.save(entitlement);
    }

    @Transactional
    public int revokeBySource(String sourceId) {
        return entitlementRepository.revokeBySourceId(sourceId, Instant.now());
    }
}
