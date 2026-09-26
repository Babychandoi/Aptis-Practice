package vn.weconex.aptis.classroom.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.ClassroomSession;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostComment;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostRead;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostUserKey;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.SessionAttendance;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.repository.ClassroomActivityRepositories.ClassroomSessionRepository;
import vn.weconex.aptis.classroom.repository.ClassroomActivityRepositories.PostCommentRepository;
import vn.weconex.aptis.classroom.repository.ClassroomActivityRepositories.PostReadRepository;
import vn.weconex.aptis.classroom.repository.ClassroomActivityRepositories.SessionAttendanceRepository;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Lịch học, điểm danh và tương tác bảng tin của lớp.
 *
 * <p>Mọi thao tác phía giáo viên đi qua requireOwnedClassroom (lớp đang chọn,
 * còn hạn); phía học viên controller kiểm là thành viên trước khi gọi.
 */
@Service
@RequiredArgsConstructor
public class ClassroomActivityService {

    private final ClassroomService classroomService;
    private final ClassroomSessionRepository sessionRepository;
    private final SessionAttendanceRepository attendanceRepository;
    private final PostReadRepository postReadRepository;
    private final PostCommentRepository commentRepository;
    private final ClassroomMemberRepository memberRepository;

    // ---------------- Lịch học ----------------

    @Transactional
    public ClassroomSession saveSession(String teacherUserId, String sessionId, Instant startsAt, Instant endsAt,
            String topic, String meetingUrl) {
        Classroom classroom = classroomService.requireOwnedClassroom(teacherUserId);
        if (startsAt == null || endsAt == null || !endsAt.isAfter(startsAt)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Giờ kết thúc phải sau giờ bắt đầu");
        }
        if (meetingUrl != null && !meetingUrl.isBlank() && !meetingUrl.trim().matches("(?i)https?://\\S+")) {
            // Chỉ nhận http(s): link này mở thẳng từ nút "Vào lớp online" của học viên.
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Link lớp online phải bắt đầu bằng http:// hoặc https://");
        }
        ClassroomSession session = sessionId == null ? new ClassroomSession() : ownedSession(classroom, sessionId);
        if (sessionId == null) {
            session.setId(UUID.randomUUID().toString());
            session.setClassroomId(classroom.getId());
            session.setCreatedBy(teacherUserId);
        }
        session.setStartsAt(startsAt);
        session.setEndsAt(endsAt);
        session.setTopic(topic == null || topic.isBlank() ? "Buổi học" : topic.trim());
        session.setMeetingUrl(meetingUrl == null || meetingUrl.isBlank() ? null : meetingUrl.trim());
        return sessionRepository.save(session);
    }

    /** Huỷ buổi học; giữ bản ghi để lịch sử điểm danh không mất. */
    @Transactional
    public void cancelSession(String teacherUserId, String sessionId) {
        Classroom classroom = classroomService.requireOwnedClassroom(teacherUserId);
        ownedSession(classroom, sessionId).setStatus(ClassroomSession.SessionStatus.CANCELLED);
    }

    @Transactional(readOnly = true)
    public List<ClassroomSession> sessionsOf(String classroomId) {
        return sessionRepository.findByClassroomIdOrderByStartsAtAsc(classroomId);
    }

    @Transactional(readOnly = true)
    public List<SessionAttendance> attendanceOf(List<String> sessionIds) {
        return sessionIds.isEmpty() ? List.of() : attendanceRepository.findBySessionIdIn(sessionIds);
    }

    @Transactional
    public void markAttendance(String teacherUserId, String sessionId, String userId, boolean present) {
        Classroom classroom = classroomService.requireOwnedClassroom(teacherUserId);
        ownedSession(classroom, sessionId);
        if (!memberRepository.isActiveMember(classroom.getId(), userId)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Học viên này không ở trong lớp");
        }
        SessionAttendance row = new SessionAttendance();
        row.setSessionId(sessionId);
        row.setUserId(userId);
        row.setPresent(present);
        row.setMarkedAt(Instant.now());
        attendanceRepository.save(row);
    }

    private ClassroomSession ownedSession(Classroom classroom, String sessionId) {
        return sessionRepository.findById(sessionId)
                .filter(s -> s.getClassroomId().equals(classroom.getId()))
                .orElseThrow(() -> ApiException.notFound("ClassroomSession", sessionId));
    }

    // ---------------- Bảng tin: đã xem, bình luận ----------------

    /** Ghi nhận học viên đã mở bài; gọi lại nhiều lần chỉ giữ một dòng. */
    @Transactional
    public void markRead(String postId, String userId) {
        if (postReadRepository.existsById(new PostUserKey(postId, userId))) return;
        PostRead read = new PostRead();
        read.setPostId(postId);
        read.setUserId(userId);
        read.setReadAt(Instant.now());
        postReadRepository.save(read);
    }

    @Transactional(readOnly = true)
    public List<PostRead> readsOf(List<String> postIds) {
        return postIds.isEmpty() ? List.of() : postReadRepository.findByPostIdIn(postIds);
    }

    @Transactional(readOnly = true)
    public List<PostComment> commentsOf(List<String> postIds) {
        return postIds.isEmpty() ? List.of() : commentRepository.findByPostIdInOrderByCreatedAtAsc(postIds);
    }

    @Transactional
    public PostComment addComment(String postId, String userId, String body) {
        if (body == null || body.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Bình luận đang trống");
        }
        PostComment comment = new PostComment();
        comment.setId(UUID.randomUUID().toString());
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setBody(body.trim().length() > 2000 ? body.trim().substring(0, 2000) : body.trim());
        return commentRepository.save(comment);
    }

    /** Giáo viên ẩn bình luận không phù hợp trong lớp mình. */
    @Transactional
    public void hideComment(String teacherUserId, String commentId, java.util.function.Predicate<String> postInClassroom) {
        classroomService.requireOwnedClassroom(teacherUserId);
        PostComment comment = commentRepository.findById(commentId)
                .filter(c -> postInClassroom.test(c.getPostId()))
                .orElseThrow(() -> ApiException.notFound("ClassroomPostComment", commentId));
        comment.setStatus(PostComment.CommentStatus.HIDDEN);
    }
}
