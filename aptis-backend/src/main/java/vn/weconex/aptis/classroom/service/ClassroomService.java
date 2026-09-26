package vn.weconex.aptis.classroom.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.PaymentStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.TeacherSettings;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.repository.ClassroomRepository;
import vn.weconex.aptis.classroom.repository.TeacherSettingsRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Lớp học của giáo viên.
 *
 * <p>Mỗi giáo viên đúng một lớp, do admin tạo cùng lúc với tài khoản. Giáo viên
 * không tự mở lớp.
 *
 * <p><b>Ranh giới dữ liệu.</b> Đây là chỗ nguy hiểm nhất của tính năng: giáo
 * viên A không được thấy học viên của giáo viên B. Mọi lối vào dữ liệu lớp đều
 * phải đi qua {@link #requireOwnedClassroom} hoặc {@link #requireMemberOf} —
 * không có hàm nào nhận thẳng {@code userId} rồi trả dữ liệu học viên.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClassroomService {

    /** Bỏ ký tự dễ đọc nhầm (0/O, 1/I/L) vì mã còn được đọc qua điện thoại. */
    private static final String CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;
    private static final int MAX_CODE_ATTEMPTS = 10;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ClassroomRepository classroomRepository;
    private final ClassroomMemberRepository memberRepository;
    private final TeacherSettingsRepository settingsRepository;

    @Transactional(readOnly = true)
    public TeacherSettings settings() {
        return settingsRepository.findById((byte) 1)
                .orElseThrow(() -> new IllegalStateException("Thiếu dòng cấu hình teacher_settings"));
    }

    // ---------------------------------------------------------------
    // Tạo lớp
    // ---------------------------------------------------------------

    /**
     * Tạo lớp cho một giáo viên vừa được admin cấp tài khoản.
     *
     * <p>Idempotent: gọi lại cho người đã có lớp thì trả về lớp cũ, không tạo
     * lớp thứ hai — ràng buộc UNIQUE ở DB cũng chặn, nhưng chặn sớm thì thông
     * báo dễ hiểu hơn là lỗi ràng buộc.
     */
    @Transactional
    public Classroom createForTeacher(String teacherUserId, String name) {
        return classroomRepository.findByTeacherUserIdOrderByCreatedAtAsc(teacherUserId).stream().findFirst().orElseGet(() -> newClassroom(teacherUserId, name));
    }

    /**
     * Admin mở thêm một lớp cho giáo viên đã có lớp.
     *
     * <p>Khác createForTeacher: không idempotent — gọi là tạo lớp mới. Quyền mở
     * lớp vẫn thuộc admin, giáo viên không tự mở được.
     */
    @Transactional
    public Classroom createAdditionalForTeacher(String teacherUserId, String name) {
        return newClassroom(teacherUserId, name);
    }

    private Classroom newClassroom(String teacherUserId, String name) {
        {
            Classroom classroom = new Classroom();
            classroom.setId(UUID.randomUUID().toString());
            classroom.setTeacherUserId(teacherUserId);
            classroom.setName(name == null || name.isBlank() ? "Lớp của tôi" : name.trim());
            classroom.setJoinCode(generateUniqueCode());
            classroomRepository.save(classroom);

            log.info("Tạo lớp {} cho giáo viên {}", classroom.getJoinCode(), teacherUserId);
            return classroom;
        }
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = randomCode();
            if (!classroomRepository.existsByJoinCode(code)) {
                return code;
            }
        }
        // 31^6 = 887 triệu tổ hợp; đụng 10 lần liên tiếp nghĩa là có gì đó sai.
        throw new IllegalStateException("Không sinh được mã lớp duy nhất");
    }

    private static String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }

    // ---------------------------------------------------------------
    // Ranh giới dữ liệu
    // ---------------------------------------------------------------

    /**
     * Lớp mà giáo viên này sở hữu.
     *
     * <p>Mọi thao tác của giáo viên phải bắt đầu từ đây. Không nhận
     * {@code classroomId} từ client rồi mới kiểm — nhận thẳng từ chủ sở hữu thì
     * không có đường nào truy cập lớp người khác.
     */
    @Transactional(readOnly = true)
    public Classroom requireOwnedClassroom(String teacherUserId) {
        Classroom classroom = ownedClassroom(teacherUserId);
        requireNotExpired(classroom);
        return classroom;
    }

    /**
     * Lớp của giáo viên, KHÔNG kiểm hạn.
     *
     * <p>Chỉ dùng cho màn hình lớp học: hết hạn thì giáo viên vẫn phải mở được
     * trang để đọc thông báo và biết đường liên hệ gia hạn. Mọi thao tác khác
     * đi qua {@link #requireOwnedClassroom}.
     */
    @Transactional(readOnly = true)
    public Classroom ownedClassroom(String teacherUserId) {
        // Giáo viên nhiều lớp: frontend gửi lớp đang chọn qua header. Mọi API
        // giáo viên đi qua đây nên không phải thêm tham số lớp cho từng API.
        // Header trỏ lớp của người khác thì báo không tìm thấy, không lộ lớp đó.
        String selected = TeacherClassroomContext.selectedClassroomId();
        if (selected != null) {
            return classroomRepository.findByIdAndTeacherUserId(selected, teacherUserId)
                    .orElseThrow(() -> new ApiException(
                            ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy lớp này trong danh sách lớp bạn dạy"));
        }
        return teacherClassrooms(teacherUserId).stream().findFirst()
                .orElseThrow(() -> new ApiException(
                        ErrorCode.RESOURCE_NOT_FOUND,
                        "Tài khoản chưa được gắn lớp học nào"));
    }

    /** Mọi lớp của giáo viên, cũ trước. */
    @Transactional(readOnly = true)
    public List<Classroom> teacherClassrooms(String teacherUserId) {
        return classroomRepository.findByTeacherUserIdOrderByCreatedAtAsc(teacherUserId);
    }

    /**
     * Admin gia hạn lớp.
     *
     * <p>Cộng từ hôm nay chứ không từ hạn cũ: gia hạn cho lớp đã hết hạn từ lâu
     * mà cộng dồn thì khách trả tiền hôm nay lại mất luôn phần đã quá.
     *
     * @param days null = bỏ hạn, lớp dùng vô thời hạn
     */
    @Transactional
    public Classroom setExpiry(String classroomId, Integer days) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> ApiException.notFound("Classroom", classroomId));

        classroom.setExpiresAt(days == null
                ? null
                : Instant.now().plus(java.time.Duration.ofDays(days)));

        log.info("Lớp {} đặt hạn: {}", classroom.getJoinCode(),
                days == null ? "vô thời hạn" : days + " ngày");
        return classroom;
    }

    /** Lớp hết hạn thì dừng mọi thao tác, chờ admin gia hạn. */
    private static void requireNotExpired(Classroom classroom) {
        if (classroom.isExpired()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Lớp của bạn đã hết hạn sử dụng. Liên hệ quản trị viên để gia hạn lớp");
        }
    }

    /**
     * Xác nhận một học viên đang ở trong lớp của giáo viên này.
     *
     * <p>Dùng trước khi trả bất kỳ dữ liệu nào của học viên — tiến độ, bài làm,
     * điểm. Thiếu bước này là giáo viên A xem được học viên của giáo viên B.
     */
    @Transactional(readOnly = true)
    public void requireMemberOf(String classroomId, String studentUserId) {
        if (!memberRepository.isActiveMember(classroomId, studentUserId)) {
            throw ApiException.forbidden("Học viên không thuộc lớp này");
        }
    }

    /** Lớp mà một học viên đang tham gia. */
    @Transactional(readOnly = true)
    public List<Classroom> classroomsOfStudent(String userId) {
        List<String> ids = memberRepository.findByUserIdAndStatus(userId, MemberStatus.ACTIVE)
                .stream()
                .map(ClassroomMember::getClassroomId)
                .toList();
        return ids.isEmpty() ? List.of() : classroomRepository.findByIdIn(ids);
    }

    /**
     * Lớp học viên đang học, chặn nếu lớp bị khoá.
     *
     * <p>Dùng ở mọi lối vào dữ liệu lớp phía học viên. Lớp hết hạn thì không
     * xem được gì nữa, kể cả bài đã giao.
     */
    @Transactional(readOnly = true)
    public Classroom requireUsableClassroom(String classroomId) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> ApiException.notFound("Classroom", classroomId));

        if (!classroom.isUsable()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Lớp đang bị khoá, không thể truy cập");
        }
        return classroom;
    }

    // ---------------------------------------------------------------
    // Vào lớp
    // ---------------------------------------------------------------

    /**
     * Học viên vào lớp bằng mã.
     *
     * <p>Lớp có phí thì vẫn cho vào nhưng để {@code PENDING} — họ xem được lớp,
     * chỉ chưa làm bài được. Chặn ngay ở cửa sẽ khiến người ta không biết mình
     * sắp mua gì.
     */
    @Transactional
    public ClassroomMember join(String userId, String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Nhập mã lớp trước khi tham gia");
        }

        String code = rawCode.trim().toUpperCase();
        Classroom classroom = classroomRepository.findByJoinCode(code)
                .orElseThrow(() -> new ApiException(
                        ErrorCode.VALIDATION_FAILED,
                        "Mã lớp không đúng. Kiểm tra lại với giáo viên",
                        Map.of("code", code)));

        if (classroom.getStatus() != Classroom.ClassroomStatus.ACTIVE) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Lớp đã đóng");
        }
        if (classroom.isExpired()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Lớp đang bị khoá, không thể truy cập");
        }
        if (!classroom.isJoinEnabled()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Lớp tạm ngừng nhận học viên mới");
        }
        if (classroom.getTeacherUserId().equals(userId)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Bạn là giáo viên của lớp này");
        }

        var existing = memberRepository.findByClassroomIdAndUserId(classroom.getId(), userId);
        if (existing.isPresent()) {
            ClassroomMember member = existing.get();
            if (member.getStatus() == MemberStatus.ACTIVE) {
                throw new ApiException(ErrorCode.CONFLICT, "Bạn đã ở trong lớp này");
            }
            if (member.getStatus() == MemberStatus.PENDING) {
                throw new ApiException(ErrorCode.CONFLICT, "Bạn đã gửi yêu cầu, hãy chờ giáo viên duyệt");
            }
            // Từng bị xoá rồi vào lại: bật lại bản ghi cũ thay vì tạo bản mới,
            // vì UNIQUE(classroom_id, user_id) không cho hai dòng. Vẫn phải đếm
            // sĩ số — người cũ quay lại cũng chiếm một chỗ như người mới.
            requireRoom(classroom);
            member.setStatus(entryStatus(classroom));
            member.setRequestedAt(Instant.now());
            member.setDecidedBy(null);
            member.setJoinedAt(Instant.now());
            member.setPaymentStatus(initialPaymentStatus(classroom));
            return member;
        }

        requireRoom(classroom);

        ClassroomMember member = new ClassroomMember();
        member.setId(UUID.randomUUID().toString());
        member.setClassroomId(classroom.getId());
        member.setUserId(userId);
        member.setStatus(entryStatus(classroom));
        member.setRequestedAt(Instant.now());
        member.setPaymentStatus(initialPaymentStatus(classroom));
        memberRepository.save(member);

        log.info("Học viên {} vào lớp {}", userId, classroom.getJoinCode());
        return member;
    }

    /**
     * Lớp bật duyệt thì vào hàng chờ, không thì vào ngay.
     *
     * <p>Người chờ duyệt chưa chiếm chỗ (requireRoom chỉ đếm ACTIVE), nên lúc
     * duyệt phải đếm sĩ số lần nữa.
     */
    private static MemberStatus entryStatus(Classroom classroom) {
        return classroom.isRequireApproval() ? MemberStatus.PENDING : MemberStatus.ACTIVE;
    }

    /** Lớp theo id, không kiểm hạn hay quyền — caller tự kiểm. */
    @Transactional(readOnly = true)
    public Classroom classroomById(String classroomId) {
        return classroomRepository.findById(classroomId)
                .orElseThrow(() -> ApiException.notFound("Classroom", classroomId));
    }

    /** Giáo viên đổi công tắc lớp và lịch học. Trường null thì giữ nguyên. */
    @Transactional
    public Classroom updateSettings(String teacherUserId, String scheduleNote, Boolean requireApproval,
            Boolean showLeaderboard, Boolean revealAnswersAfterDue) {
        Classroom classroom = requireOwnedClassroom(teacherUserId);
        if (scheduleNote != null) classroom.setScheduleNote(scheduleNote.isBlank() ? null : scheduleNote.trim());
        if (requireApproval != null) classroom.setRequireApproval(requireApproval);
        if (showLeaderboard != null) classroom.setShowLeaderboard(showLeaderboard);
        if (revealAnswersAfterDue != null) classroom.setRevealAnswersAfterDue(revealAnswersAfterDue);
        return classroom;
    }

    /**
     * Đổi mã tham gia, ví dụ khi mã cũ bị lộ ra ngoài.
     *
     * <p>Học viên đã ở trong lớp không bị ảnh hưởng; chỉ mã cũ hết dùng được.
     */
    @Transactional
    public Classroom regenerateJoinCode(String teacherUserId) {
        Classroom classroom = requireOwnedClassroom(teacherUserId);
        classroom.setJoinCode(generateUniqueCode());
        log.info("Lớp {} đổi mã tham gia", classroom.getId());
        return classroom;
    }

    @Transactional(readOnly = true)
    public List<ClassroomMember> pendingRequests(String teacherUserId) {
        Classroom classroom = ownedClassroom(teacherUserId);
        return memberRepository.findByClassroomIdAndStatusOrderByJoinedAtDesc(classroom.getId(), MemberStatus.PENDING);
    }

    /** Giáo viên duyệt hoặc từ chối một yêu cầu vào lớp. */
    @Transactional
    public ClassroomMember decideJoinRequest(String teacherUserId, String memberId, boolean approve) {
        Classroom classroom = requireOwnedClassroom(teacherUserId);
        ClassroomMember member = memberRepository.findById(memberId)
                .filter(m -> m.getClassroomId().equals(classroom.getId()))
                .orElseThrow(() -> ApiException.notFound("ClassroomMember", memberId));
        if (member.getStatus() != MemberStatus.PENDING) {
            throw new ApiException(ErrorCode.CONFLICT, "Yêu cầu này đã được xử lý");
        }
        if (approve) {
            requireRoom(classroom);
            member.setJoinedAt(Instant.now());
        }
        member.setStatus(approve ? MemberStatus.ACTIVE : MemberStatus.REJECTED);
        member.setDecidedBy(teacherUserId);
        return member;
    }

    private PaymentStatus initialPaymentStatus(Classroom classroom) {
        return classroom.isPaid() ? PaymentStatus.PENDING : PaymentStatus.NOT_REQUIRED;
    }

    /** Chặn khi lớp đã đủ học viên theo trần của gói. */
    private void requireRoom(Classroom classroom) {
        int limit = classroom.getMaxStudents() != null
                ? classroom.getMaxStudents()
                : settings().getDefaultMaxStudents();

        long current = memberRepository.countByClassroomIdAndStatus(
                classroom.getId(), MemberStatus.ACTIVE);

        if (current >= limit) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Lớp học đã đầy",
                    Map.of("limit", limit));
        }
    }

    /** Giáo viên gỡ một học viên khỏi lớp. */
    @Transactional
    public void removeMember(String teacherUserId, String studentUserId) {
        Classroom classroom = requireOwnedClassroom(teacherUserId);
        ClassroomMember member = memberRepository
                .findByClassroomIdAndUserId(classroom.getId(), studentUserId)
                .orElseThrow(() -> ApiException.notFound("ClassroomMember", studentUserId));

        member.setStatus(MemberStatus.REMOVED);
    }

    // ---------------------------------------------------------------
    // Cài đặt lớp
    // ---------------------------------------------------------------

    /** Giáo viên đặt lớp miễn phí hay có phí. */
    @Transactional
    public Classroom updatePricing(
            String teacherUserId, Classroom.PricingType pricingType, long priceAmount) {

        Classroom classroom = requireOwnedClassroom(teacherUserId);
        classroom.setPricingType(pricingType);
        classroom.setPriceAmount(pricingType == Classroom.PricingType.PAID
                ? Math.max(0, priceAmount)
                : 0);
        return classroom;
    }

    @Transactional
    public Classroom updateProfile(String teacherUserId, String name, String description) {
        Classroom classroom = requireOwnedClassroom(teacherUserId);
        if (name != null && !name.isBlank()) {
            classroom.setName(name.trim());
        }
        classroom.setDescription(description);
        return classroom;
    }

    /**
     * Kênh liên hệ hiện trong lớp.
     *
     * <p>Chuỗi rỗng quy về null để khối hỗ trợ biết đường ẩn link đó đi, thay vì
     * hiện một link trỏ tới trang trắng.
     */
    @Transactional
    public Classroom updateSupport(
            String teacherUserId, String zalo, String facebook, String group, String note) {

        Classroom classroom = requireOwnedClassroom(teacherUserId);
        classroom.setSupportZalo(rongThanhNull(zalo));
        classroom.setSupportFacebook(rongThanhNull(facebook));
        classroom.setSupportGroup(rongThanhNull(group));
        classroom.setSupportNote(rongThanhNull(note));
        return classroom;
    }

    private static String rongThanhNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional
    public Classroom setJoinEnabled(String teacherUserId, boolean enabled) {
        Classroom classroom = requireOwnedClassroom(teacherUserId);
        classroom.setJoinEnabled(enabled);
        return classroom;
    }

    // ---------------------------------------------------------------
    // Phía admin
    // ---------------------------------------------------------------

    /**
     * Admin đổi tên lớp của một giáo viên.
     *
     * <p>Tách khỏi {@link #updateProfile}: hàm kia nhận id của chính giáo viên
     * đang đăng nhập, còn hàm này admin gọi cho người khác.
     */
    @Transactional
    public void renameClassroom(String teacherUserId, String name) {
        // Giữ hành vi cũ cho màn admin: đổi tên lớp đầu tiên của giáo viên.
        classroomRepository.findByTeacherUserIdOrderByCreatedAtAsc(teacherUserId).stream().findFirst()
                .ifPresent(classroom -> classroom.setName(name));
    }

    /** Admin bật/tắt quyền dùng ngân hàng đề hệ thống cho một lớp. */
    @Transactional
    public Classroom setSystemContentEnabled(String classroomId, boolean enabled) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> ApiException.notFound("Classroom", classroomId));

        classroom.setSystemContentEnabled(enabled);
        log.info("Lớp {} {} dùng đề hệ thống",
                classroom.getJoinCode(), enabled ? "được mở" : "bị tắt");
        return classroom;
    }

    /** Admin đặt trần học viên riêng cho một lớp. */
    @Transactional
    public Classroom setMaxStudents(String classroomId, Integer maxStudents) {
        Classroom classroom = classroomRepository.findById(classroomId)
                .orElseThrow(() -> ApiException.notFound("Classroom", classroomId));

        classroom.setMaxStudents(maxStudents == null ? null : Math.max(1, maxStudents));
        return classroom;
    }

    @Transactional
    public TeacherSettings updateSettings(int platformFeePercent, int defaultMaxStudents) {
        TeacherSettings config = settings();
        config.setPlatformFeePercent(Math.max(0, Math.min(100, platformFeePercent)));
        config.setDefaultMaxStudents(Math.max(1, defaultMaxStudents));
        config.setUpdatedAt(Instant.now());
        return settingsRepository.save(config);
    }
}
