package vn.weconex.aptis.classroom.service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.classroom.domain.AssignmentQuestionSet;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.Assignment;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.Assignment.AssignmentStatus;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.AssignmentSubmission;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.AssignmentSubmission.SubmissionStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.repository.AssignmentQuestionSetRepository;
import vn.weconex.aptis.classroom.repository.AssignmentRepository;
import vn.weconex.aptis.classroom.repository.AssignmentSubmissionRepository;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.service.AttemptService;

/**
 * Giao bài và theo dõi bài nộp.
 *
 * <p>Giáo viên chọn đề từ ngân hàng hệ thống (nếu lớp được bật) hoặc đề tự
 * soạn, đặt hạn nộp; học viên làm bài mà không cần Premium riêng vì giáo viên
 * đã trả gói.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final AssignmentQuestionSetRepository assignmentQuestionSetRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final ClassroomMemberRepository memberRepository;
    private final QuestionSetRepository questionSetRepository;
    private final AttemptService attemptService;

    // ---------------------------------------------------------------
    // Giáo viên giao bài
    // ---------------------------------------------------------------

    /**
     * Tạo bài giao.
     *
     * <p>Chặn ở đây nếu lớp chưa được mở kho đề hệ thống mà giáo viên lại chọn
     * đề của hệ thống — đó chính là ranh giới thương mại của gói.
     */
    @Transactional
    public Assignment create(
            Classroom classroom, String teacherUserId, String title, String instructions,
            List<String> questionSetIds, String blueprintId, Instant dueAt) {

        Assignment assignment = new Assignment();
        assignment.setId(UUID.randomUUID().toString());
        assignment.setClassroomId(classroom.getId());
        assignment.setCreatedBy(teacherUserId);
        assignment.setTitle(title.trim());
        assignment.setInstructions(instructions);
        assignment.setDueAt(dueAt);

        if (blueprintId != null && !blueprintId.isBlank()) {
            requireSystemContent(classroom, "đề thi thử của hệ thống");
            assignment.setSourceType(Assignment.SourceType.BLUEPRINT);
            assignment.setBlueprintId(blueprintId);
            assignmentRepository.save(assignment);
        } else {
            if (questionSetIds == null || questionSetIds.isEmpty()) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED, "Chưa chọn đề nào để giao");
            }

            List<QuestionSet> sets = questionSetRepository.findAllById(questionSetIds);
            if (sets.size() != questionSetIds.size()) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED, "Có đề không tồn tại");
            }
            requireUsable(classroom, teacherUserId, sets);

            assignment.setSourceType(Assignment.SourceType.QUESTION_SETS);
            assignmentRepository.save(assignment);

            List<AssignmentQuestionSet> rows = new ArrayList<>();
            for (int i = 0; i < questionSetIds.size(); i++) {
                rows.add(new AssignmentQuestionSet(assignment.getId(), questionSetIds.get(i), i));
            }
            assignmentQuestionSetRepository.saveAll(rows);
        }

        log.info("Lớp {} giao bài \"{}\"", classroom.getJoinCode(), assignment.getTitle());
        return assignment;
    }

    /**
     * Đề giáo viên được phép giao.
     *
     * <p>Đề của chính họ thì luôn được; đề hệ thống chỉ khi lớp đã bật. Nếu
     * không kiểm, giáo viên chưa trả tiền vẫn giao được cả kho đề.
     */
    /**
     * Kiểm đề mà lớp được phép dùng, nhận trực tiếp danh sách id.
     *
     * <p>Dự đoán đề của lớp cũng gắn đề nên cần đúng ranh giới thương mại này:
     * đề hệ thống chỉ khi admin đã bật kho đề cho lớp, đề tự soạn thì phải của
     * chính giáo viên đó.
     */
    @Transactional(readOnly = true)
    public void requireUsableQuestionSets(
            Classroom classroom, String teacherUserId, List<String> questionSetIds) {

        List<QuestionSet> sets = questionSetRepository.findAllById(questionSetIds);
        if (sets.size() != questionSetIds.size()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Có đề không tồn tại");
        }
        requireUsable(classroom, teacherUserId, sets);
    }

    private void requireUsable(Classroom classroom, String teacherUserId, List<QuestionSet> sets) {
        boolean hasSystemSet = sets.stream()
                .anyMatch(qs -> qs.getOwnerTeacherId() == null);

        if (hasSystemSet) {
            requireSystemContent(classroom, "đề từ ngân hàng hệ thống");
        }

        boolean hasOtherTeacherSet = sets.stream()
                .anyMatch(qs -> qs.getOwnerTeacherId() != null
                        && !qs.getOwnerTeacherId().equals(teacherUserId));
        if (hasOtherTeacherSet) {
            throw ApiException.forbidden("Có đề thuộc giáo viên khác");
        }
    }

    private static void requireSystemContent(Classroom classroom, String what) {
        if (!classroom.isSystemContentEnabled()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Lớp chưa được mở kho đề hệ thống nên không giao được " + what
                            + ". Liên hệ quản trị để mở.");
        }
    }

    @Transactional(readOnly = true)
    public List<Assignment> listForTeacher(String classroomId) {
        return assignmentRepository.findByClassroomIdOrderByCreatedAtDesc(classroomId);
    }

    @Transactional(readOnly = true)
    public List<Assignment> listForStudent(String classroomId) {
        return assignmentRepository.findByClassroomIdAndStatusOrderByCreatedAtDesc(
                classroomId, AssignmentStatus.PUBLISHED);
    }

    /** Số bài đã nộp của từng bài giao, gom một lần. */
    @Transactional(readOnly = true)
    public Map<String, Long> submittedCounts(List<String> assignmentIds) {
        if (assignmentIds.isEmpty()) {
            return Map.of();
        }
        return submissionRepository.countSubmittedByAssignments(assignmentIds).stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0], row -> ((Number) row[1]).longValue()));
    }

    /** Số bài chờ chấm — badge trên sidebar. */
    @Transactional(readOnly = true)
    public long pendingGradingCount(String classroomId) {
        List<String> ids = assignmentRepository
                .findByClassroomIdOrderByCreatedAtDesc(classroomId).stream()
                .map(Assignment::getId)
                .toList();
        return ids.isEmpty() ? 0 : submissionRepository.countPendingGrading(ids);
    }

    @Transactional
    public Assignment close(String classroomId, String assignmentId) {
        Assignment assignment = requireInClassroom(classroomId, assignmentId);
        assignment.setStatus(AssignmentStatus.CLOSED);
        return assignment;
    }

    @Transactional
    public void delete(String classroomId, String assignmentId) {
        Assignment assignment = requireInClassroom(classroomId, assignmentId);
        assignmentQuestionSetRepository.deleteByAssignmentId(assignmentId);
        submissionRepository.deleteAll(
                submissionRepository.findByAssignmentIdOrderByCreatedAtDesc(assignmentId));
        assignmentRepository.delete(assignment);
    }

    /**
     * Bài giao phải thuộc đúng lớp đang thao tác.
     *
     * <p>Thiếu bước này thì giáo viên đoán được id là sửa được bài của lớp khác.
     */
    @Transactional(readOnly = true)
    public Assignment requireInClassroom(String classroomId, String assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> ApiException.notFound("Assignment", assignmentId));

        if (!assignment.getClassroomId().equals(classroomId)) {
            throw ApiException.forbidden("Bài giao không thuộc lớp này");
        }
        return assignment;
    }

    // ---------------------------------------------------------------
    // Học viên làm bài
    // ---------------------------------------------------------------

    /**
     * Bắt đầu làm một bài được giao.
     *
     * <p>Không kiểm Premium: giáo viên đã trả gói cho nền tảng nên học viên
     * trong lớp làm được bài giao mà không cần mua thêm. Nhưng nếu lớp có phí
     * mà học viên chưa đóng thì chặn — đó là tiền của giáo viên.
     */
    @Transactional
    public AssignmentSubmission start(String userId, String assignmentId) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> ApiException.notFound("Assignment", assignmentId));

        if (!assignment.isOpen()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Bài giao đã đóng");
        }

        ClassroomMember member = memberRepository
                .findByClassroomIdAndUserId(assignment.getClassroomId(), userId)
                .filter(m -> m.getStatus() == MemberStatus.ACTIVE)
                .orElseThrow(() -> ApiException.forbidden("Bạn không ở trong lớp này"));

        if (!member.canPractice()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Bạn chưa hoàn tất học phí lớp nên chưa làm được bài");
        }

        Optional<AssignmentSubmission> existing =
                submissionRepository.findByAssignmentIdAndUserId(assignmentId, userId);
        if (existing.isPresent() && existing.get().getAttemptId() != null) {
            // Đã bắt đầu rồi thì trả lại lượt cũ, không tạo lượt thứ hai.
            return existing.get();
        }

        List<QuestionSet> sets = questionSetsOf(assignment);
        TestAttempt attempt = attemptService.createAssignmentAttempt(userId, sets, false);

        AssignmentSubmission submission = existing.orElseGet(() -> {
            AssignmentSubmission created = new AssignmentSubmission();
            created.setId(UUID.randomUUID().toString());
            created.setAssignmentId(assignmentId);
            created.setUserId(userId);
            return created;
        });
        submission.setAttemptId(attempt.getId());
        submission.setStatus(SubmissionStatus.IN_PROGRESS);
        return submissionRepository.save(submission);
    }

    private List<QuestionSet> questionSetsOf(Assignment assignment) {
        List<String> ids = assignmentQuestionSetRepository
                .findByAssignmentIdOrderByDisplayOrder(assignment.getId()).stream()
                .map(AssignmentQuestionSet::getQuestionSetId)
                .toList();

        if (ids.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Bài giao chưa có đề nào");
        }

        // Giữ đúng thứ tự giáo viên đã xếp, không theo thứ tự DB trả về.
        Map<String, QuestionSet> byId = questionSetRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(QuestionSet::getId, Function.identity()));
        return ids.stream().map(byId::get).filter(java.util.Objects::nonNull).toList();
    }

    /**
     * Đánh dấu đã nộp khi học viên hoàn thành lượt làm bài.
     *
     * <p>Gọi từ luồng nộp bài; nộp sau hạn thì ghi LATE để giáo viên thấy.
     */
    @Transactional
    public void markSubmitted(String attemptId) {
        submissionRepository.findByAttemptId(attemptId).ifPresent(submission -> {
            Assignment assignment = assignmentRepository.findById(submission.getAssignmentId())
                    .orElse(null);

            submission.setSubmittedAt(Instant.now());
            submission.setStatus(assignment != null && assignment.isOverdue()
                    ? SubmissionStatus.LATE
                    : SubmissionStatus.SUBMITTED);
        });
    }

    @Transactional(readOnly = true)
    public List<AssignmentSubmission> submissionsOf(String assignmentId) {
        return submissionRepository.findByAssignmentIdOrderByCreatedAtDesc(assignmentId);
    }

    @Transactional(readOnly = true)
    public Map<String, AssignmentSubmission> submissionsOfStudent(
            String userId, List<String> assignmentIds) {

        if (assignmentIds.isEmpty()) {
            return Map.of();
        }
        return submissionRepository.findByUserIdAndAssignmentIdIn(userId, assignmentIds).stream()
                .collect(Collectors.toMap(AssignmentSubmission::getAssignmentId, Function.identity()));
    }

    // ---------------------------------------------------------------
    // Chấm tay
    // ---------------------------------------------------------------

    /**
     * Giáo viên chấm đè lên điểm AI.
     *
     * <p>Để trống điểm thì giữ nguyên điểm AI — giáo viên có thể chỉ muốn thêm
     * nhận xét mà không đổi điểm.
     */
    @Transactional
    public AssignmentSubmission grade(
            String classroomId, String teacherUserId, String submissionId,
            BigDecimal teacherScore, String comment) {

        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> ApiException.notFound("AssignmentSubmission", submissionId));

        // Bài nộp phải thuộc bài giao của lớp này.
        requireInClassroom(classroomId, submission.getAssignmentId());

        submission.setTeacherScore(teacherScore);
        submission.setTeacherComment(comment);
        submission.setGradedBy(teacherUserId);
        submission.setGradedAt(Instant.now());
        submission.setStatus(SubmissionStatus.GRADED);
        return submission;
    }
}
