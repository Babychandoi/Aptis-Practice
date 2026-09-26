package vn.weconex.aptis.classroom.web;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.common.security.CurrentUser;

/** Lớp học nhìn từ phía học viên. */
@RestController
@RequestMapping("/api/v1/classrooms")
@RequiredArgsConstructor
public class StudentClassroomController {

    private final ClassroomService classroomService;
    private final ClassroomMemberRepository memberRepository;
    private final UserProfileRepository profileRepository;
    private final CurrentUser currentUser;

    /** Lớp tôi đang tham gia. */
    @GetMapping("/mine")
    @Transactional(readOnly = true)
    public List<ClassroomDtos.StudentClassroomResponse> myClassrooms() {
        String userId = currentUser.requireUserId();
        List<Classroom> classrooms = classroomService.classroomsOfStudent(userId);
        if (classrooms.isEmpty()) {
            return List.of();
        }

        Map<String, String> teacherNames = namesById(
                classrooms.stream().map(Classroom::getTeacherUserId).distinct().toList());

        return classrooms.stream().map(classroom -> {
            ClassroomMember member = memberRepository
                    .findByClassroomIdAndUserId(classroom.getId(), userId)
                    .orElseThrow();

            return new ClassroomDtos.StudentClassroomResponse(
                    classroom.getId(),
                    classroom.getName(),
                    teacherNames.getOrDefault(classroom.getTeacherUserId(), "Giáo viên"),
                    classroom.isSystemContentEnabled(),
                    classroom.getPricingType().name(),
                    classroom.getPriceAmount(),
                    member.getPaymentStatus().name(),
                    member.canPractice(),
                    member.getJoinedAt(),
                    classroom.getSupportZalo(),
                    classroom.getSupportFacebook(),
                    classroom.getSupportGroup(),
                    classroom.getSupportNote(),
                    !classroom.isUsable(),
                    false,
                    classroom.getScheduleNote());
        }).toList();
    }

    /**
     * Vào lớp bằng mã.
     *
     * <p>Mã lấy từ giáo viên, gõ tay hoặc quét QR — QR chỉ chứa đường dẫn kèm
     * mã này nên hai cách đi chung một luồng.
     */
    @PostMapping("/join")
    public ClassroomDtos.StudentClassroomResponse join(
            @Valid @RequestBody ClassroomDtos.JoinClassroomRequest request) {

        String userId = currentUser.requireUserId();
        ClassroomMember member = classroomService.join(userId, request.joinCode());

        // Lấy lớp theo id chứ không lọc trong lớp đang học: lớp bật duyệt thì
        // học viên mới ở trạng thái chờ, chưa nằm trong danh sách đó.
        Classroom classroom = classroomService.classroomById(member.getClassroomId());

        String teacherName = namesById(List.of(classroom.getTeacherUserId()))
                .getOrDefault(classroom.getTeacherUserId(), "Giáo viên");

        return new ClassroomDtos.StudentClassroomResponse(
                classroom.getId(),
                classroom.getName(),
                teacherName,
                classroom.isSystemContentEnabled(),
                classroom.getPricingType().name(),
                classroom.getPriceAmount(),
                member.getPaymentStatus().name(),
                member.canPractice(),
                member.getJoinedAt(),
                classroom.getSupportZalo(),
                classroom.getSupportFacebook(),
                classroom.getSupportGroup(),
                classroom.getSupportNote(),
                !classroom.isUsable(),
                member.getStatus() == ClassroomMember.MemberStatus.PENDING,
                classroom.getScheduleNote());
    }

    private Map<String, String> namesById(List<String> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return profileRepository.findByUserIdIn(ids).stream()
                .filter(p -> p.getFullName() != null && !p.getFullName().isBlank())
                .collect(Collectors.toMap(UserProfile::getUserId, UserProfile::getFullName));
    }
}
