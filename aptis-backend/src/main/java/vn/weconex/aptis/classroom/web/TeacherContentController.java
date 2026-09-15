package vn.weconex.aptis.classroom.web;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.format.DateTimeParseException;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.classroom.domain.AssignmentQuestionSet;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.Assignment;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.AssignmentSubmission;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomMaterial;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.repository.AssignmentQuestionSetRepository;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.service.AssignmentService;
import vn.weconex.aptis.classroom.service.ClassroomContentService;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;

/**
 * Nội dung lớp và bài giao, phía giáo viên.
 *
 * <p>Không endpoint nào nhận {@code classroomId} — lớp luôn tra từ tài khoản
 * đang đăng nhập, nên giáo viên không chạm được vào lớp người khác.
 */
@RestController
@RequestMapping("/api/v1/teacher/classroom")
@RequiredArgsConstructor
public class TeacherContentController {

    private final ClassroomService classroomService;
    private final ClassroomContentService contentService;
    private final AssignmentService assignmentService;
    private final AssignmentQuestionSetRepository assignmentQuestionSetRepository;
    private final ClassroomMemberRepository memberRepository;
    private final QuestionSetRepository questionSetRepository;
    private final TestAttemptRepository attemptRepository;
    private final ComponentRepository componentRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final CurrentUser currentUser;

    // ---------------- Tài liệu ----------------

    @GetMapping("/materials")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.MaterialResponse> materials() {
        Classroom classroom = myClassroom();
        return contentService.materials(classroom.getId()).stream()
                .map(TeacherContentController::toDto)
                .toList();
    }

    @PostMapping("/materials")
    @PreAuthorize("hasAuthority('classroom:write')")
    public ClassroomDtos.MaterialResponse addMaterial(
            @Valid @RequestBody ClassroomDtos.CreateMaterialRequest request) {

        Classroom classroom = myClassroom();
        return toDto(contentService.addMaterial(
                classroom.getId(),
                currentUser.requireUserId(),
                request.title(),
                ClassroomMaterial.MaterialType.valueOf(request.materialType()),
                request.assetId(),
                request.linkUrl()));
    }

    @DeleteMapping("/materials/{materialId}")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void deleteMaterial(@PathVariable String materialId) {
        contentService.deleteMaterial(myClassroom().getId(), materialId);
    }

    // ---------------- Bảng tin lớp ----------------

    @GetMapping("/posts")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.ClassroomPostResponse> posts() {
        return contentService.posts(myClassroom().getId(), false).stream()
                .map(TeacherContentController::toDto)
                .toList();
    }

    @PostMapping("/posts")
    @PreAuthorize("hasAuthority('classroom:write')")
    public ClassroomDtos.ClassroomPostResponse addPost(
            @Valid @RequestBody ClassroomDtos.CreatePostRequest request) {

        return toDto(contentService.addPost(
                myClassroom().getId(), currentUser.requireUserId(),
                request.title(), request.content()));
    }

    @DeleteMapping("/posts/{postId}")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void deletePost(@PathVariable String postId) {
        contentService.deletePost(myClassroom().getId(), postId);
    }

    // ---------------- Dự đoán riêng ----------------

    @GetMapping("/predictions")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.ClassroomPredictionResponse> predictions() {
        List<ClassroomPrediction> rows = contentService.predictions(myClassroom().getId());
        Map<String, String> componentNames = componentNames(rows);

        return rows.stream()
                .map(row -> new ClassroomDtos.ClassroomPredictionResponse(
                        row.getId(),
                        row.getComponentId(),
                        componentName(componentNames, row.getComponentId()),
                        row.getTitle(),
                        row.getContent(),
                        row.getCreatedAt()))
                .toList();
    }

    @PostMapping("/predictions")
    @PreAuthorize("hasAuthority('classroom:write')")
    public ClassroomDtos.ClassroomPredictionResponse addPrediction(
            @Valid @RequestBody ClassroomDtos.CreatePredictionRequest request) {

        ClassroomPrediction saved = contentService.addPrediction(
                myClassroom().getId(), currentUser.requireUserId(),
                request.componentId(), request.title(), request.content());

        return new ClassroomDtos.ClassroomPredictionResponse(
                saved.getId(), saved.getComponentId(),
                componentName(componentNames(List.of(saved)), saved.getComponentId()),
                saved.getTitle(), saved.getContent(), saved.getCreatedAt());
    }

    @DeleteMapping("/predictions/{predictionId}")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void deletePrediction(@PathVariable String predictionId) {
        contentService.deletePrediction(myClassroom().getId(), predictionId);
    }

    // ---------------- Bài giao ----------------

    @GetMapping("/assignments")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.AssignmentResponse> assignments() {
        Classroom classroom = myClassroom();
        List<Assignment> rows = assignmentService.listForTeacher(classroom.getId());
        if (rows.isEmpty()) {
            return List.of();
        }

        List<String> ids = rows.stream().map(Assignment::getId).toList();
        Map<String, Long> submitted = assignmentService.submittedCounts(ids);
        long totalStudents = memberRepository.countByClassroomIdAndStatus(
                classroom.getId(), MemberStatus.ACTIVE);

        Map<String, Integer> setCounts = ids.stream().collect(Collectors.toMap(
                Function.identity(),
                id -> assignmentQuestionSetRepository.findByAssignmentIdOrderByDisplayOrder(id).size()));

        return rows.stream().map(assignment -> new ClassroomDtos.AssignmentResponse(
                assignment.getId(),
                assignment.getTitle(),
                assignment.getInstructions(),
                assignment.getSourceType().name(),
                assignment.getBlueprintId(),
                assignment.getDueAt(),
                assignment.getStatus().name(),
                setCounts.getOrDefault(assignment.getId(), 0),
                submitted.getOrDefault(assignment.getId(), 0L),
                totalStudents,
                assignment.isOverdue(),
                assignment.getCreatedAt())).toList();
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasAuthority('classroom:write')")
    public ClassroomDtos.AssignmentResponse createAssignment(
            @Valid @RequestBody ClassroomDtos.CreateAssignmentRequest request) {

        Classroom classroom = myClassroom();
        Assignment assignment = assignmentService.create(
                classroom,
                currentUser.requireUserId(),
                request.title(),
                request.instructions(),
                request.questionSetIds(),
                request.blueprintId(),
                parseInstant(request.dueAt()));

        long totalStudents = memberRepository.countByClassroomIdAndStatus(
                classroom.getId(), MemberStatus.ACTIVE);

        return new ClassroomDtos.AssignmentResponse(
                assignment.getId(),
                assignment.getTitle(),
                assignment.getInstructions(),
                assignment.getSourceType().name(),
                assignment.getBlueprintId(),
                assignment.getDueAt(),
                assignment.getStatus().name(),
                request.questionSetIds() == null ? 0 : request.questionSetIds().size(),
                0L,
                totalStudents,
                false,
                assignment.getCreatedAt());
    }

    @PostMapping("/assignments/{assignmentId}/close")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void closeAssignment(@PathVariable String assignmentId) {
        assignmentService.close(myClassroom().getId(), assignmentId);
    }

    @DeleteMapping("/assignments/{assignmentId}")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void deleteAssignment(@PathVariable String assignmentId) {
        assignmentService.delete(myClassroom().getId(), assignmentId);
    }

    /** Bài nộp của một bài giao — màn chấm bài. */
    @GetMapping("/assignments/{assignmentId}/submissions")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.SubmissionResponse> submissions(@PathVariable String assignmentId) {
        Classroom classroom = myClassroom();
        assignmentService.requireInClassroom(classroom.getId(), assignmentId);

        List<AssignmentSubmission> rows = assignmentService.submissionsOf(assignmentId);
        if (rows.isEmpty()) {
            return List.of();
        }

        List<String> userIds = rows.stream().map(AssignmentSubmission::getUserId).toList();
        Map<String, User> users = usersById(userIds);
        Map<String, String> names = namesById(userIds);

        // Điểm AI lấy từ lượt làm bài; percentage_score thang 100 nên chia 10.
        Map<String, Double> aiScores = rows.stream()
                .filter(row -> row.getAttemptId() != null)
                .map(row -> attemptRepository.findById(row.getAttemptId()).orElse(null))
                .filter(attempt -> attempt != null && attempt.getPercentageScore() != null)
                .collect(Collectors.toMap(
                        attempt -> attempt.getId(),
                        attempt -> attempt.getPercentageScore()
                                .divide(BigDecimal.TEN, 2, java.math.RoundingMode.HALF_UP)
                                .doubleValue(),
                        (a, b) -> a));

        return rows.stream().map(row -> {
            User user = users.get(row.getUserId());
            String fullName = names.getOrDefault(row.getUserId(), "");
            String email = user == null ? "" : user.getEmail();

            return new ClassroomDtos.SubmissionResponse(
                    row.getId(),
                    row.getUserId(),
                    fullName,
                    email,
                    initialOf(fullName, email),
                    row.getAttemptId(),
                    row.getStatus().name(),
                    row.getSubmittedAt(),
                    row.getAttemptId() == null ? null : aiScores.get(row.getAttemptId()),
                    row.getTeacherScore() == null ? null : row.getTeacherScore().doubleValue(),
                    row.getTeacherComment(),
                    row.getGradedAt());
        }).toList();
    }

    /** Chấm tay đè lên điểm AI. */
    @PostMapping("/submissions/{submissionId}/grade")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void grade(
            @PathVariable String submissionId,
            @Valid @RequestBody ClassroomDtos.GradeSubmissionRequest request) {

        assignmentService.grade(
                myClassroom().getId(),
                currentUser.requireUserId(),
                submissionId,
                request.teacherScore() == null ? null : BigDecimal.valueOf(request.teacherScore()),
                request.comment());
    }

    // ---------------- Đề tự soạn ----------------

    /** Đề giáo viên này đã soạn. */
    @GetMapping("/question-sets")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.TeacherQuestionSetResponse> myQuestionSets() {
        String teacherId = currentUser.requireUserId();
        return questionSetRepository.findByOwnerTeacherIdOrderByCreatedAtDesc(teacherId).stream()
                .map(qs -> new ClassroomDtos.TeacherQuestionSetResponse(
                        qs.getId(),
                        qs.getTitle(),
                        qs.getPart() == null ? "" : qs.getPart().getName(),
                        qs.getPart() == null || qs.getPart().getComponent() == null
                                ? "" : qs.getPart().getComponent().getName(),
                        qs.getStatus().name(),
                        qs.getCreatedAt()))
                .toList();
    }

    private Classroom myClassroom() {
        return classroomService.requireOwnedClassroom(currentUser.requireUserId());
    }

    private Map<String, String> componentNames(List<ClassroomPrediction> rows) {
        List<String> ids = rows.stream()
                .map(ClassroomPrediction::getComponentId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return componentRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(c -> c.getId(), c -> c.getName()));
    }

    private Map<String, User> usersById(List<String> ids) {
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private Map<String, String> namesById(List<String> ids) {
        return profileRepository.findByUserIdIn(ids).stream()
                .filter(p -> p.getFullName() != null && !p.getFullName().isBlank())
                .collect(Collectors.toMap(UserProfile::getUserId, UserProfile::getFullName));
    }

    private static String initialOf(String fullName, String email) {
        String source = fullName != null && !fullName.isBlank() ? fullName : email;
        return source == null || source.isBlank()
                ? "?"
                : source.trim().substring(0, 1).toUpperCase();
    }

    /** Hạn nộp từ client; sai định dạng thì báo rõ thay vì lặng lẽ bỏ hạn. */
    private static Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Hạn nộp không đúng định dạng");
        }
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
