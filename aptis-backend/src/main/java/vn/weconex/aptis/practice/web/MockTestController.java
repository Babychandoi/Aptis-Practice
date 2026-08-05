package vn.weconex.aptis.practice.web;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.practice.domain.BlueprintPartRule;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.domain.TestBlueprint;
import vn.weconex.aptis.practice.service.AttemptService;
import vn.weconex.aptis.practice.service.MockTestService;

/**
 * API thi thử (PHẦN IV §38).
 */
@RestController
@RequestMapping("/api/v1/mock-tests")
@RequiredArgsConstructor
public class MockTestController {

    private final MockTestService mockTestService;
    private final AttemptService attemptService;
    private final PartRepository partRepository;
    private final EntitlementService entitlementService;
    private final CurrentUser currentUser;

    /**
     * Danh sách đề thi thử. Đề PREMIUM vẫn hiện nhưng {@code canAccess=false}
     * để học viên biết có gì sau khi nâng cấp (§43).
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<PracticeDtos.MockTestResponse> list() {
        boolean hasPremium = entitlementService.hasPremiumAccess(currentUser.requireUserId());

        return mockTestService.listAvailable().stream()
                .map(blueprint -> toResponse(blueprint, hasPremium))
                .toList();
    }

    @GetMapping("/{blueprintId}")
    @Transactional(readOnly = true)
    public PracticeDtos.MockTestResponse detail(@PathVariable String blueprintId) {
        TestBlueprint blueprint = mockTestService.requireAvailable(blueprintId);
        boolean hasPremium = entitlementService.hasPremiumAccess(currentUser.requireUserId());
        return toResponse(blueprint, hasPremium);
    }

    /**
     * Tạo lượt thi thử. Trả về attempt ở trạng thái CREATED — học viên bấm start
     * riêng để đồng hồ chỉ chạy khi họ thật sự bắt đầu.
     */
    @PostMapping("/{blueprintId}/attempts")
    @ResponseStatus(HttpStatus.CREATED)
    public PracticeDtos.AttemptResponse createAttempt(@PathVariable String blueprintId) {
        String userId = currentUser.requireUserId();
        TestAttempt attempt = attemptService.createMockTestAttempt(userId, blueprintId);
        return attemptService.getAttempt(userId, attempt.getId());
    }

    // -----------------------------------------------------------------

    private PracticeDtos.MockTestResponse toResponse(TestBlueprint blueprint, boolean hasPremium) {
        List<BlueprintPartRule> rules = mockTestService.rulesOf(blueprint.getId());

        Map<String, Part> parts = partRepository
                .findAllById(rules.stream().map(BlueprintPartRule::getPartId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(Part::getId, Function.identity()));

        List<PracticeDtos.MockTestPartResponse> partResponses = rules.stream()
                .map(rule -> {
                    Part part = parts.get(rule.getPartId());
                    return new PracticeDtos.MockTestPartResponse(
                            rule.getPartId(),
                            part == null ? null : part.getName(),
                            part == null ? null : part.getComponent().getCode(),
                            rule.getQuestionSetCount(),
                            rule.getDisplayOrder());
                })
                .toList();

        return new PracticeDtos.MockTestResponse(
                blueprint.getId(),
                blueprint.getCode(),
                blueprint.getName(),
                blueprint.getDescription(),
                blueprint.getAccessLevel().name(),
                blueprint.getDurationSeconds(),
                blueprint.isFree() || hasPremium,
                partResponses,
                rules.stream().mapToInt(BlueprintPartRule::getQuestionSetCount).sum());
    }
}
