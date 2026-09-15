package vn.weconex.aptis.classroom.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.auth.domain.Role;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.RoleRepository;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.billing.repository.SubscriptionPlanRepository;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.EntitlementSourceType;
import vn.weconex.aptis.common.util.Enums.UserStatus;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;

/**
 * Admin tạo tài khoản giáo viên.
 *
 * <p>Giáo viên không tự đăng ký. Admin nhập họ tên, email, mật khẩu ban đầu và
 * chọn gói; hệ thống tạo tài khoản, gán vai TEACHER, sinh luôn một lớp và cấp
 * quyền theo gói.
 *
 * <p>Tài khoản kích hoạt sẵn, không cần xác thực email: admin đã xác nhận danh
 * tính khi tạo, bắt giáo viên bấm link chỉ thêm một bước dễ hỏng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TeacherAccountService {

    /** Quyền mở khi giáo viên có gói. */
    public static final String TEACHER_CLASSROOM = "TEACHER_CLASSROOM";

    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final RoleRepository roleRepository;
    private final UserEntitlementRepository entitlementRepository;
    private final SubscriptionPlanRepository planRepository;
    private final ClassroomService classroomService;
    private final PasswordEncoder passwordEncoder;

    /** Kết quả tạo tài khoản, đủ để admin đưa lại cho giáo viên. */
    public record CreatedTeacher(String userId, String email, Classroom classroom) {
    }

    @Transactional
    public CreatedTeacher create(
            String fullName, String rawEmail, String rawPassword,
            String classroomName, String planCode) {

        String email = rawEmail.toLowerCase().strip();
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_USED, "Email đã được sử dụng");
        }

        User user = User.register(email, passwordEncoder.encode(rawPassword));
        // Kích hoạt ngay: admin tạo nên không cần bước xác thực email.
        user.setStatus(UserStatus.ACTIVE);
        user.setEmailVerifiedAt(Instant.now());
        userRepository.save(user);

        UserProfile profile = UserProfile.forUser(user.getId());
        profile.setFullName(fullName.strip());
        profileRepository.save(profile);

        // Giữ cả STUDENT: giáo viên vẫn cần vào được phần luyện tập chung để
        // thử đề trước khi giao cho lớp.
        roleRepository.findByCode(Role.STUDENT).ifPresent(role -> user.getRoles().add(role));
        Role teacher = roleRepository.findByCode(Role.TEACHER)
                .orElseThrow(() -> new IllegalStateException("Thiếu vai TEACHER trong seed data"));
        user.getRoles().add(teacher);

        Classroom classroom = classroomService.createForTeacher(
                user.getId(),
                classroomName == null || classroomName.isBlank()
                        ? "Lớp của " + fullName.strip()
                        : classroomName.strip());

        if (planCode != null && !planCode.isBlank()) {
            grantPlan(user.getId(), planCode.strip());
        }

        log.info("Tạo tài khoản giáo viên {} kèm lớp {}", email, classroom.getJoinCode());
        return new CreatedTeacher(user.getId(), email, classroom);
    }

    /**
     * Admin sửa thông tin giáo viên.
     *
     * <p>Đổi được tên, tên lớp và đặt lại mật khẩu. Không đổi email: email là
     * thứ giáo viên dùng đăng nhập và đang gắn với phiên hiện tại, đổi ngầm sẽ
     * khiến họ mất quyền vào mà không hiểu vì sao.
     */
    @Transactional
    public void update(String teacherUserId, String fullName, String classroomName,
            String newPassword) {

        User user = userRepository.findById(teacherUserId)
                .orElseThrow(() -> ApiException.notFound("User", teacherUserId));

        if (fullName != null && !fullName.isBlank()) {
            UserProfile profile = profileRepository.findById(teacherUserId)
                    .orElseGet(() -> {
                        UserProfile created = UserProfile.forUser(teacherUserId);
                        return profileRepository.save(created);
                    });
            profile.setFullName(fullName.strip());
        }

        if (newPassword != null && !newPassword.isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(newPassword));
        }

        if (classroomName != null && !classroomName.isBlank()) {
            classroomService.renameClassroom(teacherUserId, classroomName.strip());
        }

        log.info("Admin cập nhật tài khoản giáo viên {}", user.getEmail());
    }

    /**
     * Cấp quyền giáo viên theo gói.
     *
     * <p>Dùng ADMIN_GRANT chứ không tạo đơn hàng giả: admin cấp tay là một việc
     * khác với việc giáo viên mua gói, và trộn hai thứ sẽ làm báo cáo doanh thu
     * sai.
     */
    @Transactional
    public void grantPlan(String userId, String planCode) {
        var plan = planRepository.findByCode(planCode)
                .orElseThrow(() -> ApiException.notFound("SubscriptionPlan", planCode));

        Instant now = Instant.now();
        Instant endsAt = plan.getDurationDays() == null
                ? null
                : now.plus(plan.getDurationDays(), ChronoUnit.DAYS);

        entitlementRepository.save(UserEntitlement.grant(
                userId, TEACHER_CLASSROOM, EntitlementSourceType.ADMIN_GRANT, null, now, endsAt));
    }
}
