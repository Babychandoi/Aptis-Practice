package vn.weconex.aptis.classroom.web;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.classroom.domain.QuestionSetContribution;
import vn.weconex.aptis.classroom.service.AssignmentService;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.classroom.service.TeacherContentAuthoringService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.service.AdminContentService;
import vn.weconex.aptis.content.web.AdminContentController;
import vn.weconex.aptis.content.web.AdminContentDtos;

/**
 * Giáo viên tự soạn đề cho lớp mình.
 *
 * <p>Dùng chung DTO và service soạn nội dung với admin nên có đủ 12 dạng bài.
 * Khác ở chỗ mọi endpoint đều buộc đề phải thuộc về chính giáo viên đang gọi —
 * không có tham số nào cho phép đụng vào đề của người khác.
 */
@RestController
@RequestMapping("/api/v1/teacher/question-sets")
@RequiredArgsConstructor
public class TeacherAuthoringController {

    private final TeacherContentAuthoringService authoringService;
    private final AdminContentService adminContentService;
    private final AssignmentService assignmentService;
    private final ClassroomService classroomService;
    private final QuestionSetRepository questionSetRepository;
    private final CurrentUser currentUser;

    /** Đề giáo viên đã soạn, kèm trạng thái đề xuất vào kho chung. */
    @GetMapping
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.TeacherAuthoredSetResponse> list() {
        String teacherId = currentUser.requireUserId();
        List<QuestionSet> sets = authoringService.myQuestionSets(teacherId);

        Map<String, QuestionSetContribution> contributions =
                authoringService.contributionsOf(sets.stream().map(QuestionSet::getId).toList());

        return sets.stream().map(set -> {
            QuestionSetContribution contribution = contributions.get(set.getId());
            return new ClassroomDtos.TeacherAuthoredSetResponse(
                    set.getId(),
                    set.getCode(),
                    set.getTitle(),
                    set.getPart() == null ? null : set.getPart().getId(),
                    set.getPart() == null ? "" : set.getPart().getName(),
                    set.getPart() == null || set.getPart().getComponent() == null
                            ? "" : set.getPart().getComponent().getName(),
                    set.getTaskType() == null ? null : set.getTaskType().getCode(),
                    set.getItemCount(),
                    set.getStatus().name(),
                    contribution == null ? null : contribution.getStatus().name(),
                    contribution == null ? null : contribution.getAdminNote(),
                    set.getCreatedAt());
        }).toList();
    }

    /** Nội dung đầy đủ của một đề, để mở lại trình soạn. */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional(readOnly = true)
    public AdminContentDtos.AdminQuestionSetResponse detail(@PathVariable String id) {
        QuestionSet set = authoringService.requireOwned(currentUser.requireUserId(), id);
        return AdminContentController.toResponse(set, adminContentService.loadContent(set));
    }

    /**
     * Xem trước nội dung một đề trước khi chọn giao hoặc ghép.
     *
     * <p>Khác {@code /{id}} ở chỗ đề hệ thống cũng xem được — miễn lớp đã được
     * bật kho đề. Không có đường này thì giáo viên chọn đề bằng mỗi cái tên,
     * mà tên các đề trong cùng một part gần như giống nhau.
     */
    @GetMapping("/{id}/preview")
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional(readOnly = true)
    public AdminContentDtos.PreviewResponse preview(@PathVariable String id) {
        String teacherId = currentUser.requireUserId();
        // Cùng ranh giới với giao bài: đề hệ thống chỉ khi lớp được bật kho đề,
        // đề tự soạn thì phải của chính giáo viên này.
        assignmentService.requireUsableQuestionSets(
                classroomService.requireOwnedClassroom(teacherId), teacherId, List.of(id));

        // revealAnswers = true: giáo viên cần thấy đáp án để biết đề có đúng ý
        // mình không, khác học viên đang làm bài.
        return adminContentService.preview(id, true);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('classroom:content')")
    // Dựng response cần đọc part.component, mà quan hệ đó nạp lười — ngoài
    // transaction thì Hibernate ném LazyInitializationException.
    @Transactional
    public AdminContentDtos.AdminQuestionSetResponse create(
            @Valid @RequestBody AdminContentDtos.CreateQuestionSetRequest request) {

        QuestionSet created = authoringService.create(currentUser.requireUserId(), request);
        return AdminContentController.toResponse(created, adminContentService.loadContent(created));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional
    public AdminContentDtos.AdminQuestionSetResponse update(
            @PathVariable String id,
            @Valid @RequestBody AdminContentDtos.UpdateQuestionSetRequest request) {

        QuestionSet updated = authoringService.update(currentUser.requireUserId(), id, request);
        return AdminContentController.toResponse(updated, adminContentService.loadContent(updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional
    public void delete(@PathVariable String id) {
        authoringService.delete(currentUser.requireUserId(), id);
    }

    /** Gửi đề cho quản trị viên xem xét đưa vào ngân hàng chung. */
    @PostMapping("/{id}/contribute")
    @PreAuthorize("hasAuthority('classroom:content')")
    @Transactional
    public Map<String, String> contribute(
            @PathVariable String id,
            @Valid @RequestBody ClassroomDtos.ContributeRequest request) {

        QuestionSetContribution contribution = authoringService.contribute(
                currentUser.requireUserId(), id, request.note());
        return Map.of("status", contribution.getStatus().name());
    }
}
