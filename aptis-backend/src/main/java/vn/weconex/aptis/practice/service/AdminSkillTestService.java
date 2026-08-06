package vn.weconex.aptis.practice.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.catalog.domain.ExamStructure.Component;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.common.util.Enums.PublishStatus;
import vn.weconex.aptis.common.util.Enums.SelectionStrategy;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.domain.BlueprintFixedQuestionSet;
import vn.weconex.aptis.practice.domain.BlueprintPartRule;
import vn.weconex.aptis.practice.domain.TestBlueprint;
import vn.weconex.aptis.practice.repository.BlueprintFixedQuestionSetRepository;
import vn.weconex.aptis.practice.repository.BlueprintPartRuleRepository;
import vn.weconex.aptis.practice.repository.TestBlueprintRepository;
import vn.weconex.aptis.practice.web.AdminSkillTestDtos;

@Service
@RequiredArgsConstructor
public class AdminSkillTestService {
    private final TestBlueprintRepository blueprintRepository;
    private final BlueprintPartRuleRepository ruleRepository;
    private final BlueprintFixedQuestionSetRepository fixedRepository;
    private final ComponentRepository componentRepository;
    private final PartRepository partRepository;
    private final QuestionSetRepository questionSetRepository;

    @Transactional(readOnly = true)
    public List<AdminSkillTestDtos.Response> list(String componentId) {
        List<TestBlueprint> blueprints = componentId == null
                ? blueprintRepository.findAll().stream().filter(b -> b.getComponentId() != null).toList()
                : blueprintRepository.findByComponentIdOrderByCreatedAtDesc(componentId);
        return blueprints.stream().filter(b -> b.getMode() == PracticeMode.MOCK_TEST)
                .sorted(Comparator.comparing(TestBlueprint::getCreatedAt).reversed())
                .map(this::toResponse).toList();
    }

    @Transactional
    public AdminSkillTestDtos.Response create(AdminSkillTestDtos.CreateRequest request) {
        if (blueprintRepository.existsByComponentIdAndCode(
                request.componentId(), request.code().trim().toUpperCase())) {
            throw new ApiException(ErrorCode.CONFLICT, "Mã bài test đã tồn tại.");
        }
        Component component = componentRepository.findById(request.componentId())
                .orElseThrow(() -> ApiException.notFound("Component", request.componentId()));
        List<Part> componentParts = partRepository.findByComponentIdAndActiveTrueOrderByDisplayOrder(component.getId());
        Map<String, AdminSkillTestDtos.PartSelection> selected = request.parts().stream()
                .collect(Collectors.toMap(AdminSkillTestDtos.PartSelection::partId, Function.identity(), (a, b) -> a));
        if (componentParts.isEmpty() || componentParts.stream().anyMatch(part -> !selected.containsKey(part.getId()))
                || selected.size() != componentParts.size()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Bài test hoàn chỉnh phải cấu hình đủ tất cả Part của kỹ năng.");
        }
        String mode = request.assemblyMode().toUpperCase();
        if (!List.of("FIXED", "GENERATED_RANDOM", "DYNAMIC_RANDOM").contains(mode)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Chế độ ghép đề không hợp lệ.");
        }

        TestBlueprint blueprint = new TestBlueprint();
        blueprint.setExamVersionId(component.getExamVersion().getId());
        blueprint.setComponentId(component.getId());
        blueprint.setCode(request.code().trim().toUpperCase());
        blueprint.setName(request.name().trim());
        blueprint.setDescription(request.description());
        blueprint.setAccessLevel(request.accessLevel());
        blueprint.setDurationSeconds(request.durationSeconds());
        blueprint.setMode(PracticeMode.MOCK_TEST);
        blueprint.setStatus(PublishStatus.PUBLISHED);
        blueprintRepository.save(blueprint);

        for (Part part : componentParts) {
            BlueprintPartRule rule = new BlueprintPartRule();
            rule.setBlueprintId(blueprint.getId());
            rule.setPartId(part.getId());
            rule.setQuestionSetCount(1);
            rule.setDisplayOrder(part.getDisplayOrder());
            rule.setAllowFreeContent(true);
            rule.setAllowPremiumContent(request.accessLevel().name().equals("PREMIUM"));
            rule.setSelectionStrategy(mode.equals("DYNAMIC_RANDOM") ? SelectionStrategy.RANDOM : SelectionStrategy.FIXED);
            ruleRepository.save(rule);

            if (!mode.equals("DYNAMIC_RANDOM")) {
                String questionSetId = mode.equals("GENERATED_RANDOM")
                        ? randomQuestionSet(part.getId(), request.accessLevel().name().equals("PREMIUM"))
                        : selected.get(part.getId()).questionSetId();
                QuestionSet questionSet = requireUsableQuestionSet(questionSetId, part.getId(), request.accessLevel().name().equals("PREMIUM"));
                BlueprintFixedQuestionSet fixed = new BlueprintFixedQuestionSet();
                fixed.setKey(new BlueprintFixedQuestionSet.Key(rule.getId(), questionSet.getId()));
                fixed.setDisplayOrder(1);
                fixedRepository.save(fixed);
            }
        }
        return toResponse(blueprint);
    }

    @Transactional
    public List<AdminSkillTestDtos.Response> createBatch(AdminSkillTestDtos.BatchCreateRequest request) {
        Component component = componentRepository.findById(request.componentId())
                .orElseThrow(() -> ApiException.notFound("Component", request.componentId()));
        List<Part> parts = partRepository.findByComponentIdAndActiveTrueOrderByDisplayOrder(component.getId());
        if (parts.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Kỹ năng chưa có Part để ghép đề.");
        }

        boolean allowPremium = request.accessLevel().name().equals("PREMIUM");
        Map<String, List<QuestionSet>> candidatesByPart = parts.stream().collect(Collectors.toMap(
                Part::getId,
                part -> availableQuestionSets(part.getId(), allowPremium),
                (left, right) -> left,
                java.util.LinkedHashMap::new));
        int capacity = candidatesByPart.values().stream().mapToInt(List::size).min().orElse(0);
        if (capacity == 0) {
            String missing = parts.stream()
                    .filter(part -> candidatesByPart.get(part.getId()).isEmpty())
                    .map(Part::getName).collect(Collectors.joining(", "));
            throw new ApiException(ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Chưa đủ bộ câu hỏi đã phát hành cho: " + missing);
        }
        int quantity = request.quantity() == null ? capacity : request.quantity();
        if (quantity > capacity) {
            throw new ApiException(ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Chỉ có thể ghép tối đa " + capacity + " đề không lặp bộ câu hỏi.");
        }
        candidatesByPart.values().forEach(Collections::shuffle);

        int sequence = nextSequence(component.getId());
        List<AdminSkillTestDtos.Response> created = new ArrayList<>();
        for (int index = 0; index < quantity; index++) {
            while (blueprintRepository.existsByComponentIdAndCode(
                    component.getId(), String.valueOf(sequence))) {
                sequence++;
            }
            int testNumber = sequence++;
            List<AdminSkillTestDtos.PartSelection> selections = new ArrayList<>();
            for (Part part : parts) {
                selections.add(new AdminSkillTestDtos.PartSelection(
                        part.getId(), candidatesByPart.get(part.getId()).get(index).getId()));
            }
            created.add(create(new AdminSkillTestDtos.CreateRequest(
                    component.getId(), String.valueOf(testNumber),
                    component.getName() + " Test " + testNumber,
                    "Bài test được ghép tự động từ ngân hàng câu hỏi.",
                    request.accessLevel(), request.durationSeconds(), "FIXED", selections)));
        }
        return created;
    }

    @Transactional
    public AdminSkillTestDtos.Response archive(String id) {
        TestBlueprint blueprint = blueprintRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("TestBlueprint", id));
        blueprint.setStatus(PublishStatus.ARCHIVED);
        return toResponse(blueprintRepository.save(blueprint));
    }

    private String randomQuestionSet(String partId, boolean allowPremium) {
        List<QuestionSet> candidates = availableQuestionSets(partId, allowPremium);
        if (candidates.isEmpty()) throw new ApiException(ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                "Part chưa có bộ câu hỏi phù hợp để ghép ngẫu nhiên.");
        Collections.shuffle(candidates);
        return candidates.get(0).getId();
    }

    private List<QuestionSet> availableQuestionSets(String partId, boolean allowPremium) {
        List<QuestionSet> candidates = new ArrayList<>(questionSetRepository
                .findByPartIdAndStatus(partId, ContentStatus.PUBLISHED, PageRequest.of(0, 1000)).getContent());
        if (!allowPremium) candidates.removeIf(questionSet -> !questionSet.isFree());
        return candidates;
    }

    private int nextSequence(String componentId) {
        return blueprintRepository.findByComponentIdOrderByCreatedAtDesc(componentId).stream()
                .map(TestBlueprint::getCode)
                .mapToInt(code -> {
                    try {
                        return Integer.parseInt(code);
                    } catch (NumberFormatException ignored) {
                        return 0;
                    }
                })
                .max().orElse(0) + 1;
    }

    private QuestionSet requireUsableQuestionSet(String id, String partId, boolean allowPremium) {
        if (id == null || id.isBlank()) throw new ApiException(ErrorCode.VALIDATION_FAILED,
                "Vui lòng chọn một bộ câu hỏi cho mỗi Part.");
        QuestionSet qs = questionSetRepository.findById(id).orElseThrow(() -> ApiException.notFound("QuestionSet", id));
        if (!qs.isPublished() || !qs.getPart().getId().equals(partId) || (!allowPremium && !qs.isFree())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Bộ câu hỏi không phù hợp với Part hoặc quyền truy cập.");
        }
        return qs;
    }

    private AdminSkillTestDtos.Response toResponse(TestBlueprint blueprint) {
        Component component = componentRepository.findById(blueprint.getComponentId()).orElse(null);
        List<BlueprintPartRule> rules = ruleRepository.findByBlueprintIdOrderByDisplayOrder(blueprint.getId());
        Map<String, Part> parts = partRepository.findAllById(rules.stream().map(BlueprintPartRule::getPartId).toList())
                .stream().collect(Collectors.toMap(Part::getId, Function.identity()));
        List<AdminSkillTestDtos.RuleResponse> responses = rules.stream().map(rule -> {
            Part part = parts.get(rule.getPartId());
            var fixed = fixedRepository.findByKeyBlueprintRuleIdOrderByDisplayOrder(rule.getId()).stream().findFirst().orElse(null);
            QuestionSet qs = fixed == null ? null : questionSetRepository.findById(fixed.getKey().getQuestionSetId()).orElse(null);
            return new AdminSkillTestDtos.RuleResponse(rule.getPartId(), part == null ? "Part" : part.getName(),
                    rule.getDisplayOrder(), rule.getSelectionStrategy().name(), qs == null ? null : qs.getId(),
                    qs == null ? null : qs.getTitle());
        }).toList();
        String assemblyMode = rules.stream().anyMatch(r -> r.getSelectionStrategy() == SelectionStrategy.RANDOM)
                ? "DYNAMIC_RANDOM" : "FIXED";
        return new AdminSkillTestDtos.Response(blueprint.getId(), blueprint.getComponentId(),
                component == null ? null : component.getCode(), component == null ? null : component.getName(),
                blueprint.getCode(), blueprint.getName(), blueprint.getDescription(), blueprint.getAccessLevel().name(),
                blueprint.getDurationSeconds(), blueprint.getStatus().name(), assemblyMode, responses);
    }
}
