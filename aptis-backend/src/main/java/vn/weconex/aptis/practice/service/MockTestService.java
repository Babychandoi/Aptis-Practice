package vn.weconex.aptis.practice.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

        // Seed cố định theo (user, blueprint) để RAND() trong query ổn định trong
        // cùng một lượt, nhưng khác nhau giữa các học viên
        long seed = (long) userId.hashCode() * 31 + blueprintId.hashCode();

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

        List<String> excluded = alreadyChosen.isEmpty()
                ? NO_EXCLUSION
                : new ArrayList<>(alreadyChosen);

        return questionSetRepository.selectForBlueprintRule(
                userId,
                rule.getPartId(),
                hasPremium,
                rule.isAllowFreeContent(),
                rule.isAllowPremiumContent(),
                rule.difficultyMinAsInt(),
                rule.difficultyMaxAsInt(),
                rule.getSelectionStrategy().name(),
                excluded,
                seed,
                rule.getQuestionSetCount());
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
