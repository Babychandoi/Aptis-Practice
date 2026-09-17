package vn.weconex.aptis.classroom.web;

import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.util.PageResponse;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;
import vn.weconex.aptis.practice.service.AttemptService;
import vn.weconex.aptis.practice.web.PracticeDtos;

/**
 * Giáo viên theo dõi học viên luyện tập.
 *
 * <p>Không chỉ bài mình giao: cả những lượt các em tự làm với đề hệ thống, để
 * biết em nào chăm, em nào yếu phần nào mà kèm thêm.
 *
 * <p>Ranh giới: mọi endpoint đều đi qua {@link #requireStudentInMyClassroom} —
 * lớp tra từ tài khoản đang đăng nhập, rồi kiểm học viên có trong lớp đó không.
 * Giáo viên không xem được bài của học viên lớp khác dù có id.
 */
@RestController
@RequestMapping("/api/v1/teacher/classroom/students/{studentUserId}")
@RequiredArgsConstructor
public class TeacherMonitorController {

    private final ClassroomService classroomService;
    private final ClassroomMemberRepository memberRepository;
    private final TestAttemptRepository attemptRepository;
    private final AttemptService attemptService;
    private final CurrentUser currentUser;

    /** Lịch sử luyện tập của một học viên, giống trang lịch sử em ấy thấy. */
    @GetMapping("/attempts")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public PageResponse<AttemptRow> attempts(
            @PathVariable String studentUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        requireStudentInMyClassroom(studentUserId);

        Page<TestAttempt> rows = attemptRepository.findByUserIdOrderByCreatedAtDesc(
                studentUserId, PageRequest.of(page, Math.min(size, 100)));
        return PageResponse.of(rows, AttemptRow::from);
    }

    /**
     * Chi tiết một lượt: câu hỏi, em chọn đáp án nào, đúng sai ra sao.
     *
     * <p>Dùng lại đúng dữ liệu trang kết quả của học viên nên giáo viên thấy
     * giống hệt những gì em ấy thấy.
     */
    @GetMapping("/attempts/{attemptId}")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public PracticeDtos.AttemptResponse attemptDetail(
            @PathVariable String studentUserId, @PathVariable String attemptId) {

        requireStudentInMyClassroom(studentUserId);
        requireSubmitted(attemptId);

        // Truyền studentUserId chứ không phải id giáo viên: hàm này kiểm lượt có
        // đúng của người đó không, nên id bài của học viên lớp khác sẽ bị chặn.
        return attemptService.getAttempt(studentUserId, attemptId);
    }

    /**
     * Chỉ xem được bài em đã nộp.
     *
     * <p>Bài đang làm dở là việc riêng của học viên — nhìn vào lúc em chưa xong
     * thì không công bằng. Chặn ở đây chứ không chỉ ẩn nút, vì đoán ra id bài là
     * vào xem được.
     */
    private void requireSubmitted(String attemptId) {
        TestAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> ApiException.notFound("TestAttempt", attemptId));

        boolean daNop = switch (attempt.getStatus()) {
            case SUBMITTED, SCORING, COMPLETED, EXPIRED -> true;
            default -> false;
        };
        if (!daNop) {
            throw ApiException.forbidden("Học viên chưa nộp bài này");
        }
    }

    /** Nhận xét AI của bài Speaking/Writing — phần đáng xem nhất khi kèm em. */
    @GetMapping("/attempts/{attemptId}/evaluations")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<PracticeDtos.EvaluationResultResponse> evaluations(
            @PathVariable String studentUserId, @PathVariable String attemptId) {

        requireStudentInMyClassroom(studentUserId);
        requireSubmitted(attemptId);
        return attemptService.evaluationResults(studentUserId, attemptId);
    }

    /**
     * Học viên phải đang ở trong lớp của chính giáo viên đang đăng nhập.
     *
     * <p>Lớp tra từ tài khoản, không nhận từ client — đây là chốt chặn giữa các
     * giáo viên với nhau.
     */
    private void requireStudentInMyClassroom(String studentUserId) {
        Classroom classroom = classroomService.requireOwnedClassroom(currentUser.requireUserId());
        memberRepository.findByClassroomIdAndUserId(classroom.getId(), studentUserId)
                .filter(m -> m.getStatus() == MemberStatus.ACTIVE)
                .orElseThrow(() -> ApiException.forbidden("Học viên không ở trong lớp của bạn"));
    }

    /** Một dòng lịch sử; không kèm nội dung câu hỏi cho nhẹ. */
    public record AttemptRow(
            String id,
            String mode,
            String status,
            String componentId,
            String partId,
            Instant createdAt,
            Instant completedAt,
            Double percentageScore,
            /** Điểm thô và điểm tối đa, để giáo viên thấy cả điểm chứ không chỉ phần trăm. */
            Double rawScore,
            Double maxScore,
            int totalItems,
            /** Số câu em có trả lời; totalItems trừ đi đây là số câu bỏ trống. */
            int answeredItems,
            int correctItems) {

        static AttemptRow from(TestAttempt attempt) {
            return new AttemptRow(
                    attempt.getId(),
                    attempt.getMode().name(),
                    attempt.getStatus().name(),
                    attempt.getComponentId(),
                    attempt.getPartId(),
                    attempt.getCreatedAt(),
                    attempt.getCompletedAt(),
                    attempt.getPercentageScore() == null
                            ? null : attempt.getPercentageScore().doubleValue(),
                    attempt.getRawScore() == null ? null : attempt.getRawScore().doubleValue(),
                    attempt.getMaxScore() == null ? null : attempt.getMaxScore().doubleValue(),
                    attempt.getTotalItems(),
                    attempt.getAnsweredItems(),
                    attempt.getCorrectItems());
        }
    }
}
