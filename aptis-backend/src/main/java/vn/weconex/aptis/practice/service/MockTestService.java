package vn.weconex.aptis.practice.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.content.service.ContentAccessService;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.practice.domain.BlueprintFixedQuestionSet;
import vn.weconex.aptis.practice.domain.BlueprintPartRule;
import vn.weconex.aptis.practice.domain.TestBlueprint;
import vn.weconex.aptis.practice.repository.BlueprintFixedQuestionSetRepository;
import vn.weconex.aptis.practice.repository.BlueprintPartRuleRepository;
import vn.weconex.aptis.practice.repository.TestBlueprintRepository;

/**
 * Chọn câu hỏi cho đề thi thử theo blueprint (PHẦN IV §38).
 *
 * <p>Tách khỏi {@link AttemptService} vì logic chọn theo rule khá khác luyện tập
 * thường: đi qua từng Part theo thứ tự, mỗi Part có ràng buộc riêng, và một bộ
 * câu hỏi không được xuất hiện hai lần trong cùng đề.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MockTestService {

    /** MySQL không nhận IN (), dùng sentinel khi danh sách loại trừ rỗng. */
    private static final List<String> NO_EXCLUSION = List.of("-");

    private final TestBlueprintRepository blueprintRepository;
    private final BlueprintPartRuleRepository ruleRepository;
    private final BlueprintFixedQuestionSetRepository fixedRepository;
    private final QuestionSetRepository questionSetRepository;
    private final ContentAccessService contentAccessService;
    private final EntitlementService entitlementService;
    private final vn.weconex.aptis.common.config.AptisProperties properties;

    /**
     * Danh sách bộ câu hỏi đã chọn, giữ đúng thứ tự Part của blueprint.
     */
    public record SelectedContent(
            TestBlueprint blueprint,
            List<QuestionSet> questionSets,
            AccessLevel accessLevelUsed) {
    }

    @Transactional(readOnly = true)
    public TestBlueprint requireAvailable(String blueprintId) {
        TestBlueprint blueprint = blueprintRepository.findById(blueprintId)
                .orElseThrow(() -> ApiException.notFound("TestBlueprint", blueprintId));

        if (!blueprint.isAvailable()) {
            throw new ApiException(
                    ErrorCode.CONTENT_NOT_PUBLISHED,
                    "Đề thi thử chưa được xuất bản",
                    Map.of("blueprintId", blueprintId, "status", blueprint.getStatus()));
        }
        return blueprint;
    }

    /**
     * Chọn nội dung cho một lượt thi thử.
     *
     * <p>Kiểm tra quyền hai tầng: quyền vào đề (access_level của blueprint) và
     * quyền từng bộ câu hỏi. Đề PREMIUM mà học viên chưa có quyền thì chặn ngay,
     * không tạo đề rút gọn — thi thử phải đúng cấu trúc mới có ý nghĩa.
     */
    @Transactional(readOnly = true)
    public SelectedContent selectContent(String userId, String blueprintId) {
        TestBlueprint blueprint = requireAvailable(blueprintId);
        boolean hasPremium = entitlementService.hasPremiumAccess(userId);

        if (!blueprint.isFree() && !hasPremium) {
            throw ApiException.premiumRequired();
        }

        List<BlueprintPartRule> rules =
                ruleRepository.findByBlueprintIdOrderByDisplayOrder(blueprintId);
        if (rules.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Đề thi thử chưa cấu hình Part nào",
                    Map.of("blueprintId", blueprintId));
        }

        // Seed đổi theo từng lượt: mỗi lần thi thử phải là một đề mới
        // (xem AttemptService#createMockTestAttempt). Chỉ cần ổn định trong một
        // lần gọi selectContent — sau đó nội dung đã chốt vào snapshot nên
        // RAND() không được gọi lại cho lượt đó nữa.
        //
        // Vẫn trộn userId và blueprintId vào để hai học viên bấm thi cùng lúc
        // không nhận cùng một đề.
        long seed = (long) userId.hashCode() * 31
                + blueprintId.hashCode()
                + System.nanoTime();

        Set<String> chosen = new LinkedHashSet<>();
        List<String> shortages = new ArrayList<>();

        for (BlueprintPartRule rule : rules) {
            List<String> ids = rule.isFixedSelection()
                    ? selectFixed(rule)
                    : selectByRule(userId, rule, hasPremium, chosen, seed);

            if (ids.size() < rule.getQuestionSetCount()) {
                shortages.add("%s: cần %d, có %d"
                        .formatted(rule.getPartId(), rule.getQuestionSetCount(), ids.size()));
            }
            chosen.addAll(ids);
        }

        if (chosen.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Ngân hàng đề không đủ câu hỏi để tạo đề thi thử",
                    Map.of("blueprintId", blueprintId, "shortages", shortages));
        }
        if (!shortages.isEmpty()) {
            // Vẫn cho thi nhưng ghi log để admin bổ sung ngân hàng đề
            log.warn("Đề {} thiếu câu hỏi ở một số Part: {}", blueprint.getCode(), shortages);
        }

        List<QuestionSet> questionSets = loadInOrder(new ArrayList<>(chosen));

        // Kiểm tra lại quyền từng bộ: override có thể khóa riêng một bộ nào đó
        Map<String, ContentAccessService.AccessDecision> decisions =
                contentAccessService.evaluateAll(userId, questionSets);
        List<QuestionSet> allowed = questionSets.stream()
                .filter(qs -> decisions.get(qs.getId()).allowed())
                .toList();

        if (allowed.isEmpty()) {
            throw ApiException.premiumRequired();
        }

        return new SelectedContent(
                blueprint,
                allowed,
                hasPremium ? AccessLevel.PREMIUM : AccessLevel.FREE);
    }

    @Transactional(readOnly = true)
    public List<TestBlueprint> listAvailable() {
        return blueprintRepository.findByStatusAndModeOrderByAccessLevelAscNameAsc(
                vn.weconex.aptis.common.util.Enums.PublishStatus.PUBLISHED,
                vn.weconex.aptis.common.util.Enums.PracticeMode.MOCK_TEST);
    }

    /**
     * Đề thi thử của một kỹ năng, có phân trang.
     *
     * @param componentId null = đề thi cả 5 kỹ năng
     */
    @Transactional(readOnly = true)
    public Page<TestBlueprint> listAvailable(String componentId, Pageable pageable) {
        return blueprintRepository.findAvailable(
                vn.weconex.aptis.common.util.Enums.PublishStatus.PUBLISHED,
                vn.weconex.aptis.common.util.Enums.PracticeMode.MOCK_TEST,
                componentId,
                pageable);
    }

    /**
     * Rule của nhiều blueprint trong MỘT truy vấn.
     *
     * <p>Dựng danh sách bằng cách gọi {@link #rulesOf} cho từng đề thì một trang
     * 20 đề tốn 20 truy vấn; gom lại còn một.
     */
    @Transactional(readOnly = true)
    public Map<String, List<BlueprintPartRule>> rulesOfAll(List<String> blueprintIds) {
        if (blueprintIds.isEmpty()) {
            return Map.of();
        }
        return ruleRepository.findByBlueprintIdInOrderByDisplayOrder(blueprintIds).stream()
                .collect(Collectors.groupingBy(BlueprintPartRule::getBlueprintId));
    }

    @Transactional(readOnly = true)
    public List<BlueprintPartRule> rulesOf(String blueprintId) {
        return ruleRepository.findByBlueprintIdOrderByDisplayOrder(blueprintId);
    }

    // -----------------------------------------------------------------

    /**
     * Rule FIXED: lấy đúng danh sách đã chỉ định, chỉ giữ bộ còn PUBLISHED.
     */
    private List<String> selectFixed(BlueprintPartRule rule) {
        List<String> ids = fixedRepository
                .findByKeyBlueprintRuleIdOrderByDisplayOrder(rule.getId()).stream()
                .map(f -> f.getKey().getQuestionSetId())
                .toList();

        if (ids.isEmpty()) {
            return List.of();
        }
        return loadInOrder(ids).stream().map(QuestionSet::getId).toList();
    }

    private List<String> selectByRule(
            String userId,
            BlueprintPartRule rule,
            boolean hasPremium,
            Set<String> alreadyChosen,
            long seed) {

        int needed = properties.practice().mergeSizeOf(rule.getPartId())
                .orElseGet(rule::getQuestionSetCount);

        if (needed <= 1) {
            return selectOne(userId, rule, hasPremium, alreadyChosen, NO_EXCLUSION, seed, needed);
        }

        // Part gộp câu lấy nhiều câu cho CÙNG một đề, không phải nhiều đề khác
        // nhau — loại theo chủ đề ở đây sẽ làm thiếu câu vô cớ.
        boolean avoidSameTopic = properties.practice().mergeSizeOf(rule.getPartId()).isEmpty();

        Set<String> excludedIds = new LinkedHashSet<>(alreadyChosen);
        Set<String> excludedTopics = new LinkedHashSet<>();
        List<String> picked = new ArrayList<>(needed);

        for (int i = 0; i < needed; i++) {
            // Seed lệch theo vòng để hai lần chọn không cùng một thứ tự ngẫu nhiên
            long roundSeed = seed + i;

            List<String> found = selectOne(
                    userId, rule, hasPremium, excludedIds,
                    excludedTopics.isEmpty() ? NO_EXCLUSION : new ArrayList<>(excludedTopics),
                    roundSeed, 1);

            if (found.isEmpty() && !excludedTopics.isEmpty()) {
                // Hết chủ đề chưa dùng: bỏ ràng buộc topic cho vòng này
                found = selectOne(
                        userId, rule, hasPremium, excludedIds, NO_EXCLUSION, roundSeed, 1);
                if (!found.isEmpty()) {
                    log.warn("Part {} không còn chủ đề mới, phải lấy trùng chủ đề", rule.getPartId());
                }
            }
            if (found.isEmpty()) {
                break; // hết bộ khả dụng, caller ghi nhận thiếu
            }

            String id = found.get(0);
            picked.add(id);
            excludedIds.add(id);
            if (avoidSameTopic) {
                questionSetRepository.findTopicIdById(id).ifPresent(excludedTopics::add);
            }
        }

        return picked;
    }

    private List<String> selectOne(
            String userId,
            BlueprintPartRule rule,
            boolean hasPremium,
            Set<String> excludedIds,
            List<String> excludedTopicIds,
            long seed,
            int limit) {

        List<String> excluded = excludedIds.isEmpty()
                ? NO_EXCLUSION
                : new ArrayList<>(excludedIds);

        return questionSetRepository.selectForBlueprintRuleExcludingTopics(
                userId,
                rule.getPartId(),
                hasPremium,
                rule.isAllowFreeContent(),
                rule.isAllowPremiumContent(),
                rule.difficultyMinAsInt(),
                rule.difficultyMaxAsInt(),
                rule.getSelectionStrategy().name(),
                excluded,
                excludedTopicIds,
                seed,
                limit);
    }

    /**
     * Nạp entity giữ đúng thứ tự đã chọn — {@code findAllById} không đảm bảo
     * thứ tự, mà thứ tự Part trong đề thi thử phải khớp cấu trúc thi thật.
     */
    private List<QuestionSet> loadInOrder(List<String> orderedIds) {
        if (orderedIds.isEmpty()) {
            return List.of();
        }

        Map<String, QuestionSet> byId = questionSetRepository.findAllById(orderedIds).stream()
                .filter(QuestionSet::isPublished)
                .collect(java.util.stream.Collectors.toMap(QuestionSet::getId, qs -> qs));

        return orderedIds.stream()
                .map(byId::get)
                .filter(java.util.Objects::nonNull)
                .toList();
    }
}
