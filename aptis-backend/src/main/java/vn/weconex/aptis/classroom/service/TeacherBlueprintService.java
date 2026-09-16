package vn.weconex.aptis.classroom.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.catalog.repository.ExamVersionRepository;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.web.ClassroomDtos;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.common.util.Enums.PublishStatus;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.domain.BlueprintFixedQuestionSet;
import vn.weconex.aptis.practice.domain.BlueprintPartRule;
import vn.weconex.aptis.common.util.Enums.SelectionStrategy;
import vn.weconex.aptis.practice.domain.TestBlueprint;
import vn.weconex.aptis.practice.repository.BlueprintFixedQuestionSetRepository;
import vn.weconex.aptis.practice.repository.BlueprintPartRuleRepository;
import vn.weconex.aptis.practice.repository.TestBlueprintRepository;

/**
 * Giáo viên tự ghép bài thi cho lớp: full một kỹ năng hoặc đủ 5 kỹ năng.
 *
 * <p>Dùng lại {@code test_blueprints} của hệ thống, chỉ gắn thêm
 * {@code ownerTeacherId}. Nhờ vậy bài ghép chạy qua đúng bộ máy thi thử sẵn có
 * — chấm điểm, tính giờ, nộp từng kỹ năng — thay vì phải dựng lại từ đầu.
 *
 * <p>Hai chế độ chọn đề, đều là thứ hệ thống đã hỗ trợ:
 *
 * <ul>
 *   <li>FIXED — giáo viên chọn đích danh từng đề. Cả lớp làm cùng một bộ.
 *   <li>RULES — đặt số lượng và độ khó cho mỗi part, hệ thống tự bốc. Mỗi học
 *       viên có thể ra đề khác nhau.
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherBlueprintService {

    private final TestBlueprintRepository blueprintRepository;
    private final BlueprintPartRuleRepository ruleRepository;
    private final BlueprintFixedQuestionSetRepository fixedRepository;
    private final QuestionSetRepository questionSetRepository;
    private final ExamVersionRepository examVersionRepository;
    private final AssignmentService assignmentService;

    @Transactional(readOnly = true)
    public List<TestBlueprint> myBlueprints(String teacherUserId) {
        return blueprintRepository.findByOwnerTeacherIdOrderByCreatedAtDesc(teacherUserId);
    }

    @Transactional(readOnly = true)
    public TestBlueprint requireOwned(String teacherUserId, String blueprintId) {
        TestBlueprint blueprint = blueprintRepository.findById(blueprintId)
                .orElseThrow(() -> ApiException.notFound("TestBlueprint", blueprintId));

        if (!teacherUserId.equals(blueprint.getOwnerTeacherId())) {
            throw ApiException.forbidden("Bài thi này không thuộc về bạn");
        }
        return blueprint;
    }

    @Transactional
    public TestBlueprint save(
            Classroom classroom,
            String teacherUserId,
            String blueprintId,
            ClassroomDtos.SaveBlueprintRequest request) {

        SelectionStrategy strategy = parseStrategy(request.selectionMode());

        TestBlueprint blueprint;
        if (blueprintId == null) {
            blueprint = new TestBlueprint();
            blueprint.setId(UUID.randomUUID().toString());
            blueprint.setOwnerTeacherId(teacherUserId);
            blueprint.setExamVersionId(defaultExamVersionId());
            // Mã phải là duy nhất toàn hệ thống; sinh từ UUID để không đụng mã
            // của admin và không bắt giáo viên tự nghĩ ra.
            blueprint.setCode("GV-" + UUID.randomUUID().toString().substring(0, 8)
                    .toUpperCase(Locale.ROOT));
            blueprint.setMode(PracticeMode.MOCK_TEST);
            blueprint.setStatus(PublishStatus.PUBLISHED);
        } else {
            blueprint = requireOwned(teacherUserId, blueprintId);
        }

        blueprint.setName(request.name().trim());
        blueprint.setDescription(
                request.description() == null || request.description().isBlank()
                        ? null : request.description().trim());
        blueprint.setComponentId(
                request.componentId() == null || request.componentId().isBlank()
                        ? null : request.componentId());
        blueprint.setDurationSeconds(request.durationSeconds());

        TestBlueprint saved = blueprintRepository.save(blueprint);
        replaceRules(classroom, teacherUserId, saved, strategy, request);

        log.info("Giáo viên {} lưu bài ghép {} ({})",
                teacherUserId, saved.getName(), strategy);
        return saved;
    }

    /**
     * Thay toàn bộ luật của một bài ghép.
     *
     * <p>Xoá rồi ghi lại thay vì so từng dòng: một bài có tối đa vài chục luật,
     * và cách này giữ đúng thứ tự part mà giáo viên sắp.
     */
    private void replaceRules(
            Classroom classroom,
            String teacherUserId,
            TestBlueprint blueprint,
            SelectionStrategy strategy,
            ClassroomDtos.SaveBlueprintRequest request) {

        List<BlueprintPartRule> cu = ruleRepository.findByBlueprintIdOrderByDisplayOrder(
                blueprint.getId());
        for (BlueprintPartRule rule : cu) {
            fixedRepository.deleteByKeyBlueprintRuleId(rule.getId());
        }
        ruleRepository.deleteAll(cu);
        ruleRepository.flush();

        if (strategy == SelectionStrategy.FIXED) {
            saveFixedSets(classroom, teacherUserId, blueprint, request.questionSetIds());
        } else {
            saveRules(blueprint, request.rules());
        }
    }

    /** Chọn tay: gom đề theo part, mỗi part một luật FIXED. */
    private void saveFixedSets(
            Classroom classroom,
            String teacherUserId,
            TestBlueprint blueprint,
            List<String> questionSetIds) {

        if (questionSetIds == null || questionSetIds.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Chưa chọn đề nào cho bài thi");
        }

        // Đề phải là đề lớp được dùng — cùng ranh giới với bài giao.
        assignmentService.requireUsableQuestionSets(classroom, teacherUserId, questionSetIds);

        List<QuestionSet> sets = questionSetRepository.findAllById(questionSetIds);
        // findAllById không giữ thứ tự truyền vào, mà thứ tự là thứ giáo viên
        // vừa sắp — sắp lại theo đúng danh sách gốc.
        List<QuestionSet> theoThuTu = questionSetIds.stream()
                .map(id -> sets.stream().filter(s -> s.getId().equals(id)).findFirst().orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();

        int thuTuPart = 0;
        String partHienTai = null;
        BlueprintPartRule rule = null;
        int thuTuDe = 0;

        for (QuestionSet set : theoThuTu) {
            String partId = set.getPart() == null ? null : set.getPart().getId();
            if (partId == null) {
                throw new ApiException(
                        ErrorCode.VALIDATION_FAILED,
                        "Đề \"" + set.getTitle() + "\" chưa gắn part nên không ghép được");
            }

            if (!partId.equals(partHienTai)) {
                rule = new BlueprintPartRule();
                rule.setId(UUID.randomUUID().toString());
                rule.setBlueprintId(blueprint.getId());
                rule.setPartId(partId);
                rule.setSelectionStrategy(SelectionStrategy.FIXED);
                rule.setQuestionSetCount(0);
                rule.setDisplayOrder(thuTuPart++);
                rule = ruleRepository.save(rule);
                partHienTai = partId;
                thuTuDe = 0;
            }

            BlueprintFixedQuestionSet fixed = new BlueprintFixedQuestionSet();
            fixed.setKey(new BlueprintFixedQuestionSet.Key(rule.getId(), set.getId()));
            fixed.setDisplayOrder(thuTuDe++);
            fixedRepository.save(fixed);

            rule.setQuestionSetCount(thuTuDe);
            ruleRepository.save(rule);
        }
    }

    /** Để hệ thống bốc: mỗi part một luật kèm số lượng và độ khó. */
    private void saveRules(
            TestBlueprint blueprint, List<ClassroomDtos.BlueprintRuleRequest> rules) {

        if (rules == null || rules.isEmpty()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED, "Chưa đặt luật bốc đề cho part nào");
        }

        List<BlueprintPartRule> rows = new ArrayList<>();
        for (int i = 0; i < rules.size(); i++) {
            ClassroomDtos.BlueprintRuleRequest input = rules.get(i);
            BlueprintPartRule rule = new BlueprintPartRule();
            rule.setId(UUID.randomUUID().toString());
            rule.setBlueprintId(blueprint.getId());
            rule.setPartId(input.partId());
            rule.setQuestionSetCount(input.questionSetCount());
            rule.setDifficultyMin(toByte(input.difficultyMin()));
            rule.setDifficultyMax(toByte(input.difficultyMax()));
            rule.setSelectionStrategy(SelectionStrategy.RANDOM);
            rule.setDisplayOrder(i);
            rows.add(rule);
        }
        ruleRepository.saveAll(rows);
    }

    @Transactional
    public void delete(String teacherUserId, String blueprintId) {
        TestBlueprint blueprint = requireOwned(teacherUserId, blueprintId);

        List<BlueprintPartRule> rules = ruleRepository.findByBlueprintIdOrderByDisplayOrder(
                blueprintId);
        for (BlueprintPartRule rule : rules) {
            fixedRepository.deleteByKeyBlueprintRuleId(rule.getId());
        }
        ruleRepository.deleteAll(rules);
        blueprintRepository.delete(blueprint);

        log.info("Giáo viên {} xoá bài ghép {}", teacherUserId, blueprint.getName());
    }

    @Transactional(readOnly = true)
    public List<BlueprintPartRule> rulesOf(String blueprintId) {
        return ruleRepository.findByBlueprintIdOrderByDisplayOrder(blueprintId);
    }

    @Transactional(readOnly = true)
    public List<BlueprintFixedQuestionSet> fixedSetsOf(List<String> ruleIds) {
        return ruleIds.isEmpty()
                ? List.of()
                : fixedRepository.findByKeyBlueprintRuleIdInOrderByDisplayOrder(ruleIds);
    }

    private static SelectionStrategy parseStrategy(String raw) {
        String value = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
        if (value.equals("FIXED")) {
            return SelectionStrategy.FIXED;
        }
        if (value.equals("RULES") || value.equals("RANDOM")) {
            return SelectionStrategy.RANDOM;
        }
        throw new ApiException(
                ErrorCode.VALIDATION_FAILED, "Cách chọn đề phải là FIXED hoặc RULES");
    }

    private String defaultExamVersionId() {
        return examVersionRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Chưa có phiên bản đề thi nào"))
                .getId();
    }

    private static Byte toByte(Integer value) {
        return value == null ? null : value.byteValue();
    }
}
