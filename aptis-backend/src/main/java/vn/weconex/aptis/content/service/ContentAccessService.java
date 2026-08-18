package vn.weconex.aptis.content.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.ResourceType;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.entitlement.domain.ContentAccessOverride;
import vn.weconex.aptis.entitlement.repository.ContentAccessOverrideRepository;
import vn.weconex.aptis.entitlement.service.EntitlementService;

/**
 * Cửa duy nhất để quyết định học viên có được truy cập một bộ câu hỏi hay không.
 *
 * <p>Thứ tự xét (PHẦN V §42):
 * <ol>
 *   <li>Bộ câu hỏi phải ở trạng thái PUBLISHED.</li>
 *   <li>Override (ưu tiên override riêng cho user hơn override toàn hệ thống).</li>
 *   <li>access_level của chính bộ câu hỏi.</li>
 *   <li>Entitlement Premium đọc từ DB.</li>
 * </ol>
 *
 * <p>Không bao giờ tin trạng thái Premium do client gửi lên.
 */
@Service
@RequiredArgsConstructor
public class ContentAccessService {

    private final QuestionSetRepository questionSetRepository;
    private final ContentAccessOverrideRepository overrideRepository;
    private final EntitlementService entitlementService;

    /**
     * Kết quả kiểm tra, dùng cho cả API danh sách (hiển thị ổ khóa) và
     * API tạo lượt làm bài (chặn truy cập).
     */
    public record AccessDecision(boolean allowed, AccessLevel effectiveLevel, String lockReason) {

        public static AccessDecision allow(AccessLevel level) {
            return new AccessDecision(true, level, null);
        }

        public static AccessDecision deny(AccessLevel level, ErrorCode reason) {
            return new AccessDecision(false, level, reason.name());
        }
    }

    @Transactional(readOnly = true)
    public AccessDecision evaluate(String userId, String questionSetId) {
        QuestionSet questionSet = questionSetRepository.findById(questionSetId)
                .orElseThrow(() -> ApiException.notFound("QuestionSet", questionSetId));
        return evaluate(userId, questionSet, entitlementService.hasPremiumAccess(userId));
    }

    /**
     * Biến thể nhận sẵn {@code hasPremium} để tránh truy vấn entitlement nhiều lần
     * khi kiểm tra một danh sách.
     */
    @Transactional(readOnly = true)
    public AccessDecision evaluate(String userId, QuestionSet questionSet, boolean hasPremium) {
        if (!questionSet.isPublished()) {
            return AccessDecision.deny(questionSet.getAccessLevel(), ErrorCode.CONTENT_NOT_PUBLISHED);
        }

        AccessLevel effective = effectiveAccessLevel(
                userId, questionSet.getId(), questionSet.getAccessLevel(), Instant.now());

        if (effective == AccessLevel.FREE) {
            return AccessDecision.allow(AccessLevel.FREE);
        }
        return hasPremium
                ? AccessDecision.allow(AccessLevel.PREMIUM)
                : AccessDecision.deny(AccessLevel.PREMIUM, ErrorCode.PREMIUM_REQUIRED);
    }

    /**
     * Đánh giá cả danh sách trong một lượt: một query entitlement, một query override.
     *
     * @return map questionSetId -> quyết định
     */
    @Transactional(readOnly = true)
    public Map<String, AccessDecision> evaluateAll(String userId, List<QuestionSet> questionSets) {
        if (questionSets.isEmpty()) {
            return Map.of();
        }

        boolean hasPremium = entitlementService.hasPremiumAccess(userId);
        Instant now = Instant.now();

        List<String> ids = questionSets.stream().map(QuestionSet::getId).toList();
        Map<String, AccessLevel> overrides = loadOverrides(userId, ids, now);

        Map<String, AccessDecision> result = new HashMap<>(questionSets.size());
        for (QuestionSet qs : questionSets) {
            if (!qs.isPublished()) {
                result.put(qs.getId(),
                        AccessDecision.deny(qs.getAccessLevel(), ErrorCode.CONTENT_NOT_PUBLISHED));
                continue;
            }

            AccessLevel effective = overrides.getOrDefault(qs.getId(), qs.getAccessLevel());
            if (effective == AccessLevel.FREE) {
                result.put(qs.getId(), AccessDecision.allow(AccessLevel.FREE));
            } else {
                result.put(qs.getId(), hasPremium
                        ? AccessDecision.allow(AccessLevel.PREMIUM)
                        : AccessDecision.deny(AccessLevel.PREMIUM, ErrorCode.PREMIUM_REQUIRED));
            }
        }
        return result;
    }

    /**
     * Có quyền với ÍT NHẤT MỘT bộ trong danh sách hay không.
     *
     * <p>Dùng cho asset dùng chung: một file audio có thể được nhiều bộ câu hỏi
     * tham chiếu, chỉ cần học viên đọc được một bộ là có quyền nghe file đó.
     *
     * <p>Danh sách rỗng trả {@code false} — không suy ra được bộ nào chứa asset
     * thì mặc định từ chối, không mặc định cho qua.
     */
    @Transactional(readOnly = true)
    public boolean canAccessAny(String userId, List<String> questionSetIds) {
        if (questionSetIds.isEmpty()) {
            return false;
        }
        List<QuestionSet> questionSets = questionSetRepository.findAllById(questionSetIds);
        return evaluateAll(userId, questionSets).values().stream()
                .anyMatch(AccessDecision::allowed);
    }

    /**
     * Ném lỗi nếu không được truy cập. Dùng trước khi tạo lượt làm bài,
     * trả nội dung, hay cấp signed URL.
     */
    @Transactional(readOnly = true)
    public void requireAccess(String userId, String questionSetId) {
        AccessDecision decision = evaluate(userId, questionSetId);
        if (!decision.allowed()) {
            throw new ApiException(
                    ErrorCode.valueOf(decision.lockReason()),
                    "Không có quyền truy cập bộ câu hỏi " + questionSetId,
                    Map.of("questionSetId", questionSetId, "accessLevel", decision.effectiveLevel()));
        }
    }

    private AccessLevel effectiveAccessLevel(
            String userId, String questionSetId, AccessLevel declared, Instant now) {

        return loadOverrides(userId, List.of(questionSetId), now)
                .getOrDefault(questionSetId, declared);
    }

    /**
     * Query trả override của user trước override chung, nên khi gặp id đã có
     * trong map thì bỏ qua — override riêng thắng.
     */
    private Map<String, AccessLevel> loadOverrides(String userId, List<String> ids, Instant now) {
        List<ContentAccessOverride> overrides =
                overrideRepository.findActiveFor(ResourceType.QUESTION_SET, ids, userId, now);

        Map<String, AccessLevel> byResource = new HashMap<>();
        for (ContentAccessOverride override : overrides) {
            byResource.putIfAbsent(override.getResourceId(), override.getAccessLevel());
        }
        return byResource;
    }
}
