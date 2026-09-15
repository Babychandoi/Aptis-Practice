package vn.weconex.aptis.classroom.web;

import java.time.Instant;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.repository.ClassroomStatsRepository;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.common.security.CurrentUser;

/**
 * Lớp học nhìn từ phía giáo viên.
 *
 * <p>Mỗi giáo viên đúng một lớp nên không endpoint nào nhận {@code classroomId}
 * từ client — lớp luôn lấy từ tài khoản đang đăng nhập. Nhờ vậy không có đường
 * nào để giáo viên A chạm vào lớp của giáo viên B.
 */
@RestController
@RequestMapping("/api/v1/teacher/classroom")
@RequiredArgsConstructor
public class TeacherClassroomController {

    private final ClassroomService classroomService;
    private final ClassroomMemberRepository memberRepository;
    private final ClassroomStatsRepository statsRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final CurrentUser currentUser;

    /** Lớp của tôi. */
    @GetMapping
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public ClassroomDtos.ClassroomResponse myClassroom() {
        Classroom classroom = classroomService.requireOwnedClassroom(currentUser.requireUserId());
        return toDto(classroom);
    }

    /** Danh sách học viên kèm tiến độ tóm tắt. */
    @GetMapping("/students")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.ClassroomStudentResponse> students() {
        Classroom classroom = classroomService.requireOwnedClassroom(currentUser.requireUserId());

        List<ClassroomMember> members = memberRepository
                .findByClassroomIdAndStatusOrderByJoinedAtDesc(classroom.getId(), MemberStatus.ACTIVE);
        if (members.isEmpty()) {
            return List.of();
        }

        List<String> userIds = members.stream().map(ClassroomMember::getUserId).toList();
        Map<String, User> users = usersById(userIds);
        Map<String, String> names = namesById(userIds);

        // Gộp thống kê một lần cho cả lớp, không hỏi từng người.
        Map<String, Object[]> stats = statsRepository.summaryByUsers(userIds).stream()
                .collect(Collectors.toMap(row -> (String) row[0], Function.identity()));

        return members.stream().map(member -> {
            User user = users.get(member.getUserId());
            Object[] row = stats.get(member.getUserId());
            String fullName = names.getOrDefault(member.getUserId(), "");
            String email = user == null ? "" : user.getEmail();

            return new ClassroomDtos.ClassroomStudentResponse(
                    member.getUserId(),
                    fullName,
                    email,
                    initialOf(fullName, email),
                    row == null ? 0L : ((Number) row[1]).longValue(),
                    row == null || row[2] == null ? null : ((Number) row[2]).doubleValue(),
                    row == null ? null : toInstant(row[3]),
                    member.getPaymentStatus().name(),
                    member.getJoinedAt());
        }).toList();
    }

    /** Điểm mạnh / yếu của cả lớp theo kỹ năng. */
    @GetMapping("/progress")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.ClassProgressResponse> progress() {
        Classroom classroom = classroomService.requireOwnedClassroom(currentUser.requireUserId());

        List<String> userIds = memberRepository
                .findByClassroomIdAndStatusOrderByJoinedAtDesc(classroom.getId(), MemberStatus.ACTIVE)
                .stream()
                .map(ClassroomMember::getUserId)
                .toList();
        if (userIds.isEmpty()) {
            return List.of();
        }

        return statsRepository.classProgressByUsers(userIds).stream()
                .map(row -> new ClassroomDtos.ClassProgressResponse(
                        (String) row[0],
                        (String) row[1],
                        row[2] == null ? 0 : ((Number) row[2]).intValue()))
                .toList();
    }

    @PutMapping
    @PreAuthorize("hasAuthority('classroom:write')")
    public ClassroomDtos.ClassroomResponse update(
            @Valid @RequestBody ClassroomDtos.UpdateClassroomRequest request) {

        return toDto(classroomService.updateProfile(
                currentUser.requireUserId(), request.name(), request.description()));
    }

    /** Đặt lớp miễn phí hay có phí. */
    @PutMapping("/pricing")
    @PreAuthorize("hasAuthority('classroom:write')")
    public ClassroomDtos.ClassroomResponse updatePricing(
            @Valid @RequestBody ClassroomDtos.UpdatePricingRequest request) {

        Classroom.PricingType type = Classroom.PricingType.valueOf(request.pricingType());
        return toDto(classroomService.updatePricing(
                currentUser.requireUserId(), type, request.priceAmount()));
    }

    /** Tạm ngừng hoặc mở lại việc nhận học viên mới. */
    @PutMapping("/join-enabled")
    @PreAuthorize("hasAuthority('classroom:write')")
    public ClassroomDtos.ClassroomResponse setJoinEnabled(
            @Valid @RequestBody ClassroomDtos.ToggleJoinRequest request) {

        return toDto(classroomService.setJoinEnabled(
                currentUser.requireUserId(), request.joinEnabled()));
    }

    /** Gỡ một học viên khỏi lớp. */
    @DeleteMapping("/students/{studentUserId}")
    @PreAuthorize("hasAuthority('classroom:write')")
    public void removeStudent(@PathVariable String studentUserId) {
        classroomService.removeMember(currentUser.requireUserId(), studentUserId);
    }

    private ClassroomDtos.ClassroomResponse toDto(Classroom classroom) {
        long students = memberRepository.countByClassroomIdAndStatus(
                classroom.getId(), MemberStatus.ACTIVE);

        int limit = classroom.getMaxStudents() != null
                ? classroom.getMaxStudents()
                : classroomService.settings().getDefaultMaxStudents();

        return new ClassroomDtos.ClassroomResponse(
                classroom.getId(),
                classroom.getName(),
                classroom.getDescription(),
                classroom.getJoinCode(),
                classroom.isJoinEnabled(),
                classroom.isSystemContentEnabled(),
                classroom.getPricingType().name(),
                classroom.getPriceAmount(),
                limit,
                students,
                classroom.getStatus().name());
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

    /** Chữ cái đầu để vẽ avatar; rơi về email khi chưa có tên. */
    private static String initialOf(String fullName, String email) {
        String source = fullName != null && !fullName.isBlank() ? fullName : email;
        return source == null || source.isBlank()
                ? "?"
                : source.trim().substring(0, 1).toUpperCase();
    }

    /** Native query trả java.sql.Timestamp, không phải Instant. */
    private static Instant toInstant(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant();
        }
        return value instanceof Instant instant ? instant : null;
    }
}
