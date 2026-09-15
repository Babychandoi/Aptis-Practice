package vn.weconex.aptis.classroom.web;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.Assignment;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.AssignmentSubmission;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomMaterial;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.repository.ClassroomRepository;
import vn.weconex.aptis.classroom.service.AssignmentService;
import vn.weconex.aptis.classroom.service.ClassroomContentService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;

/**
 * Không gian lớp học của học viên.
 *
 * <p>Mọi endpoint xác nhận người gọi đang ở trong lớp trước khi trả dữ liệu —
 * biết {@code classroomId} không đủ để xem nội dung lớp người khác.
 */
@RestController
@RequestMapping("/api/v1/classrooms/{classroomId}")
@RequiredArgsConstructor
public class StudentWorkspaceController {

    private final ClassroomRepository classroomRepository;
    private final ClassroomMemberRepository memberRepository;
    private final ClassroomContentService contentService;
    private final AssignmentService assignmentService;
    private final ComponentRepository componentRepository;
    private final CurrentUser currentUser;

    /** Bài được giao, kèm trạng thái làm bài của chính mình. */
    @GetMapping("/assignments")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.StudentAssignmentResponse> assignments(
            @PathVariable String classroomId) {

        Classroom classroom = requireMembership(classroomId);
        String userId = currentUser.requireUserId();

        List<Assignment> rows = assignmentService.listForStudent(classroomId);
        if (rows.isEmpty()) {
            return List.of();
        }

        Map<String, AssignmentSubmission> mine = assignmentService.submissionsOfStudent(
                userId, rows.stream().map(Assignment::getId).toList());

        return rows.stream().map(assignment -> {
            AssignmentSubmission submission = mine.get(assignment.getId());
            return new ClassroomDtos.StudentAssignmentResponse(
                    assignment.getId(),
                    classroomId,
                    classroom.getName(),
                    assignment.getTitle(),
                    assignment.getInstructions(),
                    assignment.getDueAt(),
                    assignment.isOverdue(),
                    submission == null ? "NOT_STARTED" : submission.getStatus().name(),
                    submission == null ? null : submission.getAttemptId(),
                    submission == null || submission.getTeacherScore() == null
                            ? null : submission.getTeacherScore().doubleValue(),
                    submission == null ? null : submission.getTeacherComment());
        }).toList();
    }

    /**
     * Bắt đầu làm một bài được giao.
     *
     * <p>Trả về id lượt làm bài để client chuyển sang màn làm bài sẵn có.
     */
    @PostMapping("/assignments/{assignmentId}/start")
    public Map<String, String> start(
            @PathVariable String classroomId, @PathVariable String assignmentId) {

        requireMembership(classroomId);
        AssignmentSubmission submission = assignmentService.start(
                currentUser.requireUserId(), assignmentId);

        return Map.of("attemptId", submission.getAttemptId());
    }

    @GetMapping("/materials")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.MaterialResponse> materials(@PathVariable String classroomId) {
        requireMembership(classroomId);
        return contentService.materials(classroomId).stream()
                .map(StudentWorkspaceController::toDto)
                .toList();
    }

    /** Bảng tin lớp — học viên chỉ thấy bài đã đăng, không thấy bài bị ẩn. */
    @GetMapping("/posts")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.ClassroomPostResponse> posts(@PathVariable String classroomId) {
        requireMembership(classroomId);
        return contentService.posts(classroomId, true).stream()
                .map(StudentWorkspaceController::toDto)
                .toList();
    }

    @GetMapping("/predictions")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.ClassroomPredictionResponse> predictions(
            @PathVariable String classroomId) {

        requireMembership(classroomId);
        List<ClassroomPrediction> rows = contentService.predictions(classroomId);

        List<String> componentIds = rows.stream()
                .map(ClassroomPrediction::getComponentId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<String, String> names = componentIds.isEmpty()
                ? Map.of()
                : componentRepository.findAllById(componentIds).stream()
                        .collect(Collectors.toMap(c -> c.getId(), c -> c.getName()));

        return rows.stream()
                .map(row -> new ClassroomDtos.ClassroomPredictionResponse(
                        row.getId(),
                        row.getComponentId(),
                        componentName(names, row.getComponentId()),
                        row.getTitle(),
                        row.getContent(),
                        row.getCreatedAt()))
                .toList();
    }

    /**
     * Người gọi phải đang ở trong lớp.
     *
     * <p>Thiếu bước này thì biết id lớp là xem được tài liệu, bảng tin và bài
     * giao của lớp bất kỳ.
     */
    private Classroom requireMembership(String classroomId) {
        if (!memberRepository.isActiveMember(classroomId, currentUser.requireUserId())) {
            throw ApiException.forbidden("Bạn không ở trong lớp này");
        }
        return classroomRepository.findById(classroomId)
                .orElseThrow(() -> ApiException.notFound("Classroom", classroomId));
    }

    /**
     * Tên kỹ năng của một dự đoán.
     *
     * <p>componentId có thể null khi giáo viên không gán kỹ năng, mà Map.of()
     * ném NullPointerException nếu tra bằng key null.
     */
    private static String componentName(Map<String, String> names, String componentId) {
        return componentId == null ? "" : names.getOrDefault(componentId, "");
    }

    private static ClassroomDtos.MaterialResponse toDto(ClassroomMaterial material) {
        return new ClassroomDtos.MaterialResponse(
                material.getId(),
                material.getTitle(),
                material.getMaterialType().name(),
                material.getAssetId(),
                material.getLinkUrl(),
                material.getCreatedAt());
    }

    private static ClassroomDtos.ClassroomPostResponse toDto(ClassroomPost post) {
        return new ClassroomDtos.ClassroomPostResponse(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                post.getStatus().name(),
                post.getCreatedAt());
    }
}
