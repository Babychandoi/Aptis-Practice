package vn.weconex.aptis.classroom.web;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.classroom.service.TeacherBlueprintService;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.domain.BlueprintFixedQuestionSet;
import vn.weconex.aptis.common.util.Enums.SelectionStrategy;
import vn.weconex.aptis.practice.domain.BlueprintPartRule;
import vn.weconex.aptis.practice.domain.TestBlueprint;

/**
 * Giáo viên tự ghép bài thi cho lớp: full một kỹ năng hoặc đủ 5 kỹ năng.
 *
 * <p>Không endpoint nào nhận id lớp — lớp luôn tra từ tài khoản đang đăng nhập,
 * và mọi bài đều buộc thuộc về chính giáo viên gọi.
 */
@RestController
@RequestMapping("/api/v1/teacher/blueprints")
@RequiredArgsConstructor
public class TeacherBlueprintController {

    private final TeacherBlueprintService blueprintService;
    private final ClassroomService classroomService;
    private final ComponentRepository componentRepository;
    private final QuestionSetRepository questionSetRepository;
    private final CurrentUser currentUser;

    @GetMapping
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.TeacherBlueprintResponse> list() {
        List<TestBlueprint> rows = blueprintService.myBlueprints(currentUser.requireUserId());
        if (rows.isEmpty()) {
            return List.of();
        }

        Map<String, String> componentNames = componentNames(rows);

        return rows.stream().map(row -> {
            List<BlueprintPartRule> rules = blueprintService.rulesOf(row.getId());
            boolean chonTay = rules.stream().anyMatch(
                    r -> r.getSelectionStrategy() == SelectionStrategy.FIXED);

            return new ClassroomDtos.TeacherBlueprintResponse(
                    row.getId(),
                    row.getCode(),
                    row.getName(),
                    row.getDescription(),
                    row.getComponentId(),
                    row.getComponentId() == null
                            ? "Đủ 5 kỹ năng"
                            : componentNames.getOrDefault(row.getComponentId(), ""),
                    chonTay ? "FIXED" : "RULES",
                    row.getDurationSeconds(),
                    row.getStatus().name(),
                    rules.stream().mapToInt(BlueprintPartRule::getQuestionSetCount).sum(),
                    rules.size(),
                    row.getCreatedAt());
        }).toList();
    }

    /** Đề đã chọn đích danh trong một bài ghép, để mở lại form sửa. */
    @GetMapping("/{id}/question-sets")
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.BlueprintFixedSetResponse> questionSets(@PathVariable String id) {
        blueprintService.requireOwned(currentUser.requireUserId(), id);

        List<BlueprintPartRule> rules = blueprintService.rulesOf(id);
        List<BlueprintFixedQuestionSet> fixed = blueprintService.fixedSetsOf(
                rules.stream().map(BlueprintPartRule::getId).toList());

        if (fixed.isEmpty()) {
            return List.of();
        }

        var sets = questionSetRepository
                .findAllById(fixed.stream().map(f -> f.getKey().getQuestionSetId()).toList())
                .stream()
                .collect(Collectors.toMap(qs -> qs.getId(), Function.identity()));

        return fixed.stream()
                .map(f -> sets.get(f.getKey().getQuestionSetId()))
                .filter(java.util.Objects::nonNull)
                .map(qs -> new ClassroomDtos.BlueprintFixedSetResponse(
                        qs.getId(),
                        qs.getTitle(),
                        qs.getPart() == null ? null : qs.getPart().getId(),
                        qs.getPart() == null ? "" : qs.getPart().getName(),
                        qs.getPart() == null || qs.getPart().getComponent() == null
                                ? "" : qs.getPart().getComponent().getName(),
                        0))
                .toList();
    }

    /** Luật bốc đề của một bài ghép, khi giáo viên không chọn tay. */
    @GetMapping("/{id}/rules")
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.BlueprintRuleRequest> rules(@PathVariable String id) {
        blueprintService.requireOwned(currentUser.requireUserId(), id);
        return blueprintService.rulesOf(id).stream()
                .map(rule -> new ClassroomDtos.BlueprintRuleRequest(
                        rule.getPartId(),
                        rule.getQuestionSetCount(),
                        rule.getDifficultyMin() == null ? null : (int) rule.getDifficultyMin(),
                        rule.getDifficultyMax() == null ? null : (int) rule.getDifficultyMax()))
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('classroom:content')")
    public ClassroomDtos.TeacherBlueprintResponse create(
            @Valid @RequestBody ClassroomDtos.SaveBlueprintRequest request) {

        String teacherId = currentUser.requireUserId();
        TestBlueprint saved = blueprintService.save(
                classroomService.requireOwnedClassroom(teacherId), teacherId, null, request);
        return toResponse(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('classroom:content')")
    public ClassroomDtos.TeacherBlueprintResponse update(
            @PathVariable String id,
            @Valid @RequestBody ClassroomDtos.SaveBlueprintRequest request) {

        String teacherId = currentUser.requireUserId();
        TestBlueprint saved = blueprintService.save(
                classroomService.requireOwnedClassroom(teacherId), teacherId, id, request);
        return toResponse(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('classroom:content')")
    public void delete(@PathVariable String id) {
        blueprintService.delete(currentUser.requireUserId(), id);
    }

    private ClassroomDtos.TeacherBlueprintResponse toResponse(TestBlueprint row) {
        List<BlueprintPartRule> rules = blueprintService.rulesOf(row.getId());
        boolean chonTay = rules.stream().anyMatch(
                r -> r.getSelectionStrategy() == SelectionStrategy.FIXED);

        return new ClassroomDtos.TeacherBlueprintResponse(
                row.getId(),
                row.getCode(),
                row.getName(),
                row.getDescription(),
                row.getComponentId(),
                row.getComponentId() == null
                        ? "Đủ 5 kỹ năng"
                        : componentNames(List.of(row)).getOrDefault(row.getComponentId(), ""),
                chonTay ? "FIXED" : "RULES",
                row.getDurationSeconds(),
                row.getStatus().name(),
                rules.stream().mapToInt(BlueprintPartRule::getQuestionSetCount).sum(),
                rules.size(),
                row.getCreatedAt());
    }

    /**
     * Tên kỹ năng theo id, nạp một lượt.
     *
     * <p>componentId null nghĩa là bài đủ 5 kỹ năng nên phải lọc trước khi tra —
     * {@code Map.of()} ném NullPointerException với khoá null.
     */
    private Map<String, String> componentNames(List<TestBlueprint> rows) {
        List<String> ids = rows.stream()
                .map(TestBlueprint::getComponentId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        return ids.isEmpty()
                ? Map.of()
                : componentRepository.findAllById(ids).stream()
                        .collect(Collectors.toMap(c -> c.getId(), c -> c.getName()));
    }
}
