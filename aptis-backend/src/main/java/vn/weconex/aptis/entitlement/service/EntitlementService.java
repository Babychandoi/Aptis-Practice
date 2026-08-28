package vn.weconex.aptis.entitlement.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final AptisProperties properties;

    /**
     * Có quyền Premium — do đã mua, hoặc còn trong thời gian dùng thử tính từ
     * lúc tạo tài khoản.
     *
     * <p>Dùng thử tính theo {@code users.created_at} thay vì cấp entitlement
     * riêng: khỏi phải chạy job cấp quyền cho từng người đăng ký, và đổi số ngày
     * trong cấu hình là đổi hạn của cả những người đã đăng ký.
     *
     * <p>Mọi luồng kiểm quyền đều gọi qua đây (ContentAccessService,
     * AttemptService, MockTestService, các controller nội dung Premium), nên chỉ
     * cần nới ở một chỗ.
     */
    @Transactional(readOnly = true)
    public boolean hasPremiumAccess(String userId) {
        if (hasEntitlement(userId, properties.entitlement().premiumCode())) {
            return true;
        }
        return withinSignupTrial(userId);
    }

    /** Còn trong hạn dùng thử kể từ lúc tạo tài khoản? */
    @Transactional(readOnly = true)
    public boolean withinSignupTrial(String userId) {
        if (properties.entitlement().signupTrialDays() <= 0) {
            return false;
        }
        return userRepository.findById(userId)
                .map(user -> properties.entitlement()
                        .withinSignupTrial(user.getCreatedAt(), Instant.now()))
                .orElse(false);
    }

    /**
     * Thời điểm hết hạn dùng thử. {@code Optional.empty()} khi tắt dùng thử hoặc
     * không tìm thấy tài khoản — dùng để hiện đếm ngược cho học viên.
     */
    @Transactional(readOnly = true)
    public Optional<Instant> signupTrialEndsAt(String userId) {
        int days = properties.entitlement().signupTrialDays();
        if (days <= 0) {
            return Optional.empty();
        }
        return userRepository.findById(userId)
                .map(User::getCreatedAt)
                .filter(java.util.Objects::nonNull)
                .map(createdAt -> createdAt.plus(java.time.Duration.ofDays(days)));
    }

    /**
     * Nội dung gắn nhãn FREE có còn mở cho người không trả phí?
     *
     * <p>Bật {@code paywall-after-trial} thì FREE chỉ còn là phân loại nội bộ:
     * hết dùng thử là mọi bộ đề, mọi đề thi thử đều cần Premium.
     */
    public boolean freeContentStillOpen() {
        return !properties.entitlement().paywallAfterTrial();
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
