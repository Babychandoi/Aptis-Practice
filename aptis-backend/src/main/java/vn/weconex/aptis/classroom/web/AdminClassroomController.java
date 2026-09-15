package vn.weconex.aptis.classroom.web;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.TeacherSettings;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.repository.ClassroomRepository;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.classroom.service.TeacherAccountService;
import vn.weconex.aptis.common.util.PageResponse;

/** Quản trị lớp học và tài khoản giáo viên. */
@RestController
@RequestMapping("/api/v1/admin/classrooms")
@RequiredArgsConstructor
public class AdminClassroomController {

    private final ClassroomService classroomService;
    private final TeacherAccountService teacherAccountService;
    private final ClassroomRepository classroomRepository;
    private final ClassroomMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;

    /** Toàn bộ lớp trong hệ thống. */
    @GetMapping
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public PageResponse<ClassroomDtos.AdminClassroomResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<Classroom> classrooms = classroomRepository
                .findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));

        Map<String, ClassroomDtos.AdminClassroomResponse> rows = toRows(classrooms.getContent())
                .stream()
                .collect(Collectors.toMap(
                        ClassroomDtos.AdminClassroomResponse::id, Function.identity()));

        return PageResponse.of(classrooms, classroom -> rows.get(classroom.getId()));
    }

    /** Bảng tài khoản giáo viên. */
    @GetMapping("/teachers")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.AdminTeacherResponse> teachers() {
        List<Classroom> classrooms = classroomRepository.findAll();
        if (classrooms.isEmpty()) {
            return List.of();
        }

        List<String> teacherIds = classrooms.stream()
                .map(Classroom::getTeacherUserId).distinct().toList();
        Map<String, User> users = usersById(teacherIds);
        Map<String, String> names = namesById(teacherIds);
        Map<String, Long> counts = studentCounts(classrooms);

        return classrooms.stream().map(classroom -> {
            User user = users.get(classroom.getTeacherUserId());
            return new ClassroomDtos.AdminTeacherResponse(
                    classroom.getTeacherUserId(),
                    names.getOrDefault(classroom.getTeacherUserId(), ""),
                    user == null ? "" : user.getEmail(),
                    classroom.getName(),
                    classroom.getJoinCode(),
                    counts.getOrDefault(classroom.getId(), 0L),
                    null,
                    null,
                    classroom.getStatus().name());
        }).toList();
    }

    /**
     * Tạo tài khoản giáo viên.
     *
     * <p>Hệ thống tự sinh một lớp gắn với tài khoản này — giáo viên đăng nhập
     * là có lớp sẵn, không phải làm thêm bước nào.
     */
    @PostMapping("/teachers")
    @PreAuthorize("hasAuthority('classroom:admin')")
    public ClassroomDtos.CreateTeacherResponse createTeacher(
            @Valid @RequestBody ClassroomDtos.CreateTeacherRequest request) {

        var created = teacherAccountService.create(
                request.fullName(),
                request.email(),
                request.password(),
                request.classroomName(),
                request.planCode());

        return new ClassroomDtos.CreateTeacherResponse(
                created.userId(),
                created.email(),
                created.classroom().getId(),
                created.classroom().getJoinCode());
    }

    /** Bật/tắt quyền dùng ngân hàng đề hệ thống cho một lớp. */
    @PutMapping("/{classroomId}/system-content")
    @PreAuthorize("hasAuthority('classroom:admin')")
    public ClassroomDtos.AdminClassroomResponse toggleSystemContent(
            @PathVariable String classroomId,
            @Valid @RequestBody ClassroomDtos.ToggleSystemContentRequest request) {

        Classroom classroom = classroomService.setSystemContentEnabled(
                classroomId, request.enabled());
        return toRows(List.of(classroom)).get(0);
    }

    /** Đặt trần học viên riêng cho một lớp. */
    @PutMapping("/{classroomId}/max-students")
    @PreAuthorize("hasAuthority('classroom:admin')")
    public ClassroomDtos.AdminClassroomResponse setMaxStudents(
            @PathVariable String classroomId,
            @Valid @RequestBody ClassroomDtos.SetMaxStudentsRequest request) {

        Classroom classroom = classroomService.setMaxStudents(classroomId, request.maxStudents());
        return toRows(List.of(classroom)).get(0);
    }

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('classroom:read')")
    @Transactional(readOnly = true)
    public ClassroomDtos.TeacherSettingsResponse settings() {
        TeacherSettings config = classroomService.settings();
        return new ClassroomDtos.TeacherSettingsResponse(
                config.getPlatformFeePercent(), config.getDefaultMaxStudents());
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAuthority('classroom:admin')")
    public ClassroomDtos.TeacherSettingsResponse updateSettings(
            @Valid @RequestBody ClassroomDtos.UpdateTeacherSettingsRequest request) {

        TeacherSettings config = classroomService.updateSettings(
                request.platformFeePercent(), request.defaultMaxStudents());
        return new ClassroomDtos.TeacherSettingsResponse(
                config.getPlatformFeePercent(), config.getDefaultMaxStudents());
    }

    /**
     * Dựng danh sách lớp kèm thông tin giáo viên.
     *
     * <p>Gom user, hồ sơ và số học viên theo lô — gọi lẻ từng lớp sẽ thành N+1.
     */
    private List<ClassroomDtos.AdminClassroomResponse> toRows(List<Classroom> classrooms) {
        if (classrooms.isEmpty()) {
            return List.of();
        }

        List<String> teacherIds = classrooms.stream()
                .map(Classroom::getTeacherUserId).distinct().toList();
        Map<String, User> users = usersById(teacherIds);
        Map<String, String> names = namesById(teacherIds);
        Map<String, Long> counts = studentCounts(classrooms);
        int defaultLimit = classroomService.settings().getDefaultMaxStudents();

        return classrooms.stream().map(classroom -> {
            User user = users.get(classroom.getTeacherUserId());
            return new ClassroomDtos.AdminClassroomResponse(
                    classroom.getId(),
                    classroom.getName(),
                    classroom.getTeacherUserId(),
                    names.getOrDefault(classroom.getTeacherUserId(), ""),
                    user == null ? "" : user.getEmail(),
                    classroom.getJoinCode(),
                    counts.getOrDefault(classroom.getId(), 0L),
                    classroom.getMaxStudents() != null ? classroom.getMaxStudents() : defaultLimit,
                    classroom.isSystemContentEnabled(),
                    classroom.getPricingType().name(),
                    classroom.getPriceAmount(),
                    classroom.getStatus().name(),
                    classroom.getCreatedAt());
        }).toList();
    }

    private Map<String, Long> studentCounts(List<Classroom> classrooms) {
        List<String> ids = classrooms.stream().map(Classroom::getId).toList();
        return memberRepository.countActiveByClassroomIds(ids).stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0], row -> ((Number) row[1]).longValue()));
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
}
