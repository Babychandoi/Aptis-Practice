package vn.weconex.aptis.classroom.web;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.ClassroomSession;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostComment;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostRead;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.SessionAttendance;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.repository.ClassroomStatsRepository;
import vn.weconex.aptis.classroom.service.ClassroomActivityService;
import vn.weconex.aptis.classroom.service.ClassroomContentService;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;

/**
 * Lịch học, điểm danh, bình luận và thành viên lớp — hai phía giáo viên và
 * học viên trong một chỗ vì dùng chung cách dựng dữ liệu trả về.
 */
@RestController
@RequiredArgsConstructor
public class ClassroomActivityController {

    private static final String TEACHER = "/api/v1/teacher/classroom";
    private static final String STUDENT = "/api/v1/classrooms/{classroomId}";

    private final ClassroomActivityService activityService;
    private final ClassroomService classroomService;
    private final ClassroomContentService contentService;
    private final ClassroomMemberRepository memberRepository;
    private final ClassroomStatsRepository statsRepository;
    private final UserProfileRepository profileRepository;
    private final CurrentUser currentUser;

    // =============================== Giáo viên ===============================

    @GetMapping(TEACHER + "/sessions")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<SessionResponse> teacherSessions() {
        Classroom classroom = classroomService.ownedClassroom(currentUser.requireUserId());
        return sessionsWithAttendance(classroom, null);
    }

    @PostMapping(TEACHER + "/sessions")
    @PreAuthorize("hasAuthority('classroom:write')")
    public SessionResponse addSession(@Valid @RequestBody SaveSessionRequest request) {
        return toDto(activityService.saveSession(currentUser.requireUserId(), null,
                request.startsAt(), request.endsAt(), request.topic(), request.meetingUrl()), 0, 0, null);
    }

    @PutMapping(TEACHER + "/sessions/{sessionId}")
    @PreAuthorize("hasAuthority('classroom:write')")
    public SessionResponse updateSession(@PathVariable String sessionId, @Valid @RequestBody SaveSessionRequest request) {
        return toDto(activityService.saveSession(currentUser.requireUserId(), sessionId,
                request.startsAt(), request.endsAt(), request.topic(), request.meetingUrl()), 0, 0, null);
    }

    @DeleteMapping(TEACHER + "/sessions/{sessionId}")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void cancelSession(@PathVariable String sessionId) {
        activityService.cancelSession(currentUser.requireUserId(), sessionId);
    }

    /** Điểm danh một buổi: mọi học viên đang trong lớp kèm trạng thái có mặt. */
    @GetMapping(TEACHER + "/sessions/{sessionId}/attendance")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<AttendanceRow> attendance(@PathVariable String sessionId) {
        Classroom classroom = classroomService.ownedClassroom(currentUser.requireUserId());
        List<ClassroomMember> members = activeMembers(classroom.getId());
        Map<String, Boolean> marked = activityService.attendanceOf(List.of(sessionId)).stream()
                .collect(Collectors.toMap(SessionAttendance::getUserId, SessionAttendance::isPresent));
        Map<String, String> names = namesOf(members.stream().map(ClassroomMember::getUserId).toList());
        return members.stream()
                .map(m -> new AttendanceRow(m.getUserId(), names.getOrDefault(m.getUserId(), "Học viên"), marked.get(m.getUserId())))
                .toList();
    }

    @PutMapping(TEACHER + "/sessions/{sessionId}/attendance")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void markAttendance(@PathVariable String sessionId, @Valid @RequestBody MarkAttendanceRequest request) {
        activityService.markAttendance(currentUser.requireUserId(), sessionId, request.userId(), request.present());
    }

    /** Số người đã xem và số bình luận của từng bài, cho dòng "3/18 đã xem". */
    @GetMapping(TEACHER + "/posts/engagement")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<PostEngagement> postEngagement() {
        Classroom classroom = classroomService.ownedClassroom(currentUser.requireUserId());
        List<String> postIds = contentService.posts(classroom.getId(), false).stream().map(ClassroomPost::getId).toList();
        return engagementOf(classroom.getId(), postIds);
    }

    @GetMapping(TEACHER + "/posts/{postId}/comments")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<CommentResponse> teacherComments(@PathVariable String postId) {
        Classroom classroom = classroomService.ownedClassroom(currentUser.requireUserId());
        contentService.post(classroom.getId(), postId);
        return comments(postId, true);
    }

    @PutMapping(TEACHER + "/comments/{commentId}/hide")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void hideComment(@PathVariable String commentId) {
        String teacherId = currentUser.requireUserId();
        Classroom classroom = classroomService.ownedClassroom(teacherId);
        activityService.hideComment(teacherId, commentId, postId -> {
            try {
                contentService.post(classroom.getId(), postId);
                return true;
            } catch (ApiException ex) {
                return false;
            }
        });
    }

    // =============================== Học viên ===============================

    /** Lịch học của lớp, kèm buổi sắp tới gần nhất để đếm ngược. */
    @GetMapping(STUDENT + "/sessions")
    @Transactional(readOnly = true)
    public List<SessionResponse> studentSessions(@PathVariable String classroomId) {
        Classroom classroom = requireMembership(classroomId);
        return sessionsWithAttendance(classroom, currentUser.requireUserId());
    }

    @PostMapping(STUDENT + "/posts/{postId}/read")
    public void markRead(@PathVariable String classroomId, @PathVariable String postId) {
        requireMembership(classroomId);
        contentService.post(classroomId, postId);
        activityService.markRead(postId, currentUser.requireUserId());
    }

    @GetMapping(STUDENT + "/posts/engagement")
    @Transactional(readOnly = true)
    public List<PostEngagement> studentEngagement(@PathVariable String classroomId) {
        requireMembership(classroomId);
        List<String> postIds = contentService.posts(classroomId, true).stream().map(ClassroomPost::getId).toList();
        return engagementOf(classroomId, postIds);
    }

    @GetMapping(STUDENT + "/posts/{postId}/comments")
    @Transactional(readOnly = true)
    public List<CommentResponse> studentComments(@PathVariable String classroomId, @PathVariable String postId) {
        requireMembership(classroomId);
        contentService.post(classroomId, postId);
        return comments(postId, false);
    }

    @PostMapping(STUDENT + "/posts/{postId}/comments")
    public CommentResponse comment(@PathVariable String classroomId, @PathVariable String postId,
            @Valid @RequestBody AddCommentRequest request) {
        requireMembership(classroomId);
        contentService.post(classroomId, postId);
        String userId = currentUser.requireUserId();
        PostComment saved = activityService.addComment(postId, userId, request.body());
        return new CommentResponse(saved.getId(), userId, namesOf(List.of(userId)).getOrDefault(userId, "Bạn"),
                saved.getBody(), false, saved.getCreatedAt());
    }

    /**
     * Thành viên lớp. Điểm chỉ hiện khi giáo viên bật bảng xếp hạng — mặc định
     * học viên không thấy điểm của nhau.
     */
    @GetMapping(STUDENT + "/members")
    @Transactional(readOnly = true)
    public MembersResponse members(@PathVariable String classroomId) {
        Classroom classroom = requireMembership(classroomId);
        String me = currentUser.requireUserId();
        List<ClassroomMember> members = activeMembers(classroomId);
        List<String> ids = members.stream().map(ClassroomMember::getUserId).toList();
        List<String> nameIds = new java.util.ArrayList<>(ids);
        nameIds.add(classroom.getTeacherUserId());
        Map<String, String> names = namesOf(nameIds);
        Map<String, Double> scores = new HashMap<>();
        if (classroom.isShowLeaderboard() && !ids.isEmpty()) {
            for (Object[] row : statsRepository.summaryByUsers(ids)) {
                // summaryByUsers trả điểm thang 10; quy về thang 50 như mọi chỗ khác.
                if (row[2] != null) scores.put((String) row[0], ((Number) row[2]).doubleValue() * 5);
            }
        }
        List<MemberRow> rows = members.stream()
                .map(m -> new MemberRow(m.getUserId(), names.getOrDefault(m.getUserId(), "Học viên"),
                        m.getUserId().equals(me), scores.get(m.getUserId())))
                .toList();
        return new MembersResponse(names.getOrDefault(classroom.getTeacherUserId(), "Giáo viên"),
                classroom.isShowLeaderboard(), rows);
    }

    // =============================== Dùng chung ===============================

    private List<SessionResponse> sessionsWithAttendance(Classroom classroom, String viewerUserId) {
        List<ClassroomSession> sessions = activityService.sessionsOf(classroom.getId());
        List<SessionAttendance> marks = activityService.attendanceOf(sessions.stream().map(ClassroomSession::getId).toList());
        long total = memberRepository.countByClassroomIdAndStatus(classroom.getId(), MemberStatus.ACTIVE);
        return sessions.stream().map(s -> {
            List<SessionAttendance> ofSession = marks.stream().filter(a -> a.getSessionId().equals(s.getId())).toList();
            long present = ofSession.stream().filter(SessionAttendance::isPresent).count();
            Boolean mine = viewerUserId == null ? null : ofSession.stream()
                    .filter(a -> a.getUserId().equals(viewerUserId)).map(SessionAttendance::isPresent).findFirst().orElse(null);
            return toDto(s, present, ofSession.isEmpty() ? 0 : total, mine);
        }).toList();
    }

    private List<PostEngagement> engagementOf(String classroomId, List<String> postIds) {
        long members = memberRepository.countByClassroomIdAndStatus(classroomId, MemberStatus.ACTIVE);
        Map<String, Long> reads = activityService.readsOf(postIds).stream()
                .collect(Collectors.groupingBy(PostRead::getPostId, Collectors.counting()));
        Map<String, Long> comments = activityService.commentsOf(postIds).stream()
                .filter(c -> c.getStatus() == PostComment.CommentStatus.VISIBLE)
                .collect(Collectors.groupingBy(PostComment::getPostId, Collectors.counting()));
        return postIds.stream()
                .map(id -> new PostEngagement(id, reads.getOrDefault(id, 0L), members, comments.getOrDefault(id, 0L)))
                .toList();
    }

    private List<CommentResponse> comments(String postId, boolean includeHidden) {
        List<PostComment> list = activityService.commentsOf(List.of(postId)).stream()
                .filter(c -> includeHidden || c.getStatus() == PostComment.CommentStatus.VISIBLE)
                .toList();
        Map<String, String> names = namesOf(list.stream().map(PostComment::getUserId).distinct().toList());
        return list.stream()
                .map(c -> new CommentResponse(c.getId(), c.getUserId(), names.getOrDefault(c.getUserId(), "Thành viên"),
                        c.getBody(), c.getStatus() == PostComment.CommentStatus.HIDDEN, c.getCreatedAt()))
                .toList();
    }

    private List<ClassroomMember> activeMembers(String classroomId) {
        return memberRepository.findByClassroomIdAndStatusOrderByJoinedAtDesc(classroomId, MemberStatus.ACTIVE);
    }

    private Map<String, String> namesOf(List<String> ids) {
        if (ids.isEmpty()) return Map.of();
        return profileRepository.findByUserIdIn(ids).stream()
                .filter(p -> p.getFullName() != null && !p.getFullName().isBlank())
                .collect(Collectors.toMap(UserProfile::getUserId, UserProfile::getFullName, (a, b) -> a));
    }

    /** Học viên phải đang ở trong lớp và lớp còn dùng được. */
    private Classroom requireMembership(String classroomId) {
        if (!memberRepository.isActiveMember(classroomId, currentUser.requireUserId())) {
            throw ApiException.forbidden("Bạn không ở trong lớp này");
        }
        return classroomService.requireUsableClassroom(classroomId);
    }

    private static SessionResponse toDto(ClassroomSession s, long present, long total, Boolean mine) {
        return new SessionResponse(s.getId(), s.getStartsAt(), s.getEndsAt(), s.getTopic(), s.getMeetingUrl(),
                s.getStatus().name(), present, total, mine);
    }

    // =============================== DTO ===============================

    public record SaveSessionRequest(
            @NotNull Instant startsAt,
            @NotNull Instant endsAt,
            @Size(max = 255) String topic,
            @Size(max = 1000) String meetingUrl) {
    }

    /**
     * Một buổi học. presentCount/totalCount chỉ có nghĩa khi đã điểm danh
     * (totalCount = 0 là chưa điểm danh); myAttendance chỉ trả cho học viên.
     */
    public record SessionResponse(String id, Instant startsAt, Instant endsAt, String topic, String meetingUrl,
            String status, long presentCount, long totalCount, Boolean myAttendance) {
    }

    public record AttendanceRow(String userId, String fullName, Boolean present) {
    }

    public record MarkAttendanceRequest(@NotBlank String userId, boolean present) {
    }

    public record PostEngagement(String postId, long readCount, long memberCount, long commentCount) {
    }

    public record AddCommentRequest(@NotBlank @Size(max = 2000) String body) {
    }

    public record CommentResponse(String id, String userId, String fullName, String body, boolean hidden, Instant createdAt) {
    }

    public record MemberRow(String userId, String fullName, boolean you, Double score50) {
    }

    public record MembersResponse(String teacherName, boolean leaderboard, List<MemberRow> members) {
    }
}
