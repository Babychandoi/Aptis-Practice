package vn.weconex.aptis.classroom.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.PaymentStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.TeacherSettings;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.repository.ClassroomRepository;
import vn.weconex.aptis.classroom.repository.TeacherSettingsRepository;
import vn.weconex.aptis.common.exception.ApiException;

/**
 * Ranh giới dữ liệu giữa các giáo viên.
 *
 * <p>Giáo viên A xem được học viên của giáo viên B là lỗi nghiêm trọng nhất mà
 * tính năng này có thể mắc. Chặn nằm ở chỗ service không nhận {@code classroomId}
 * từ client — lớp luôn tra từ tài khoản đang đăng nhập.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClassroomBoundaryTest {

    @Mock
    private ClassroomRepository classroomRepository;
    @Mock
    private ClassroomMemberRepository memberRepository;
    @Mock
    private TeacherSettingsRepository settingsRepository;

    @InjectMocks
    private ClassroomService service;

    private final String teacherA = UUID.randomUUID().toString();
    private final String teacherB = UUID.randomUUID().toString();
    private final String studentOfB = UUID.randomUUID().toString();

    private Classroom classroomOf(String teacherId, String code) {
        Classroom classroom = new Classroom();
        classroom.setId(UUID.randomUUID().toString());
        classroom.setTeacherUserId(teacherId);
        classroom.setName("Lớp thử");
        classroom.setJoinCode(code);
        return classroom;
    }

    @Test
    @DisplayName("Giáo viên chỉ lấy được lớp của chính mình")
    void teacherGetsOnlyOwnClassroom() {
        Classroom lopA = classroomOf(teacherA, "AAA111");
        when(classroomRepository.findByTeacherUserId(teacherA)).thenReturn(Optional.of(lopA));

        Classroom result = service.requireOwnedClassroom(teacherA);

        assertThat(result.getTeacherUserId()).isEqualTo(teacherA);
    }

    @Test
    @DisplayName("Giáo viên chưa có lớp thì báo lỗi, không trả lớp người khác")
    void teacherWithoutClassroomFails() {
        when(classroomRepository.findByTeacherUserId(teacherB)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireOwnedClassroom(teacherB))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("chưa được gắn lớp");
    }

    @Test
    @DisplayName("Không xem được học viên của lớp khác")
    void cannotReadStudentOfAnotherClassroom() {
        Classroom lopA = classroomOf(teacherA, "AAA111");
        // Học viên này thuộc lớp của giáo viên B, không thuộc lớp A.
        when(memberRepository.isActiveMember(lopA.getId(), studentOfB)).thenReturn(false);

        assertThatThrownBy(() -> service.requireMemberOf(lopA.getId(), studentOfB))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("không thuộc lớp này");
    }

    @Test
    @DisplayName("Xem được học viên trong lớp của mình")
    void canReadOwnStudent() {
        Classroom lopA = classroomOf(teacherA, "AAA111");
        String studentOfA = UUID.randomUUID().toString();
        when(memberRepository.isActiveMember(lopA.getId(), studentOfA)).thenReturn(true);

        // Không ném lỗi là đạt.
        service.requireMemberOf(lopA.getId(), studentOfA);
    }

    @Test
    @DisplayName("Giáo viên không tự vào lớp của chính mình như học viên")
    void teacherCannotJoinOwnClassroom() {
        Classroom lopA = classroomOf(teacherA, "AAA111");
        when(settingsRepository.findById((byte) 1)).thenReturn(Optional.of(new TeacherSettings()));
        when(classroomRepository.findByJoinCode("AAA111")).thenReturn(Optional.of(lopA));

        assertThatThrownBy(() -> service.join(teacherA, "AAA111"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("giáo viên của lớp này");
    }

    @Test
    @DisplayName("Mã lớp sai thì báo rõ, không lộ lớp nào tồn tại")
    void wrongCodeFails() {
        when(settingsRepository.findById((byte) 1)).thenReturn(Optional.of(new TeacherSettings()));
        when(classroomRepository.findByJoinCode("ZZZ999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.join(studentOfB, "ZZZ999"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Mã lớp không đúng");
    }

    @Test
    @DisplayName("Lớp đủ học viên theo gói thì không nhận thêm")
    void fullClassroomRejects() {
        Classroom lopA = classroomOf(teacherA, "AAA111");
        TeacherSettings config = new TeacherSettings();
        config.setDefaultMaxStudents(2);

        when(settingsRepository.findById((byte) 1)).thenReturn(Optional.of(config));
        when(classroomRepository.findByJoinCode("AAA111")).thenReturn(Optional.of(lopA));
        when(memberRepository.findByClassroomIdAndUserId(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(memberRepository.countByClassroomIdAndStatus(lopA.getId(), MemberStatus.ACTIVE))
                .thenReturn(2L);

        assertThatThrownBy(() -> service.join(studentOfB, "AAA111"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đã đủ học viên");

        verify(memberRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lớp có phí thì vào được nhưng chưa làm bài được cho tới khi trả tiền")
    void paidClassroomStartsPending() {
        Classroom lopA = classroomOf(teacherA, "AAA111");
        lopA.setPricingType(Classroom.PricingType.PAID);
        lopA.setPriceAmount(300_000L);

        when(settingsRepository.findById((byte) 1)).thenReturn(Optional.of(new TeacherSettings()));
        when(classroomRepository.findByJoinCode("AAA111")).thenReturn(Optional.of(lopA));
        when(memberRepository.findByClassroomIdAndUserId(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(memberRepository.countByClassroomIdAndStatus(anyString(), any())).thenReturn(0L);
        when(memberRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        ClassroomMember member = service.join(studentOfB, "AAA111");

        assertThat(member.getPaymentStatus()).isEqualTo(PaymentStatus.PENDING);
        // Vào xem được lớp, nhưng chưa luyện được — đúng ý: chặn ngay ở cửa thì
        // người ta không biết mình sắp mua gì.
        assertThat(member.canPractice()).isFalse();
    }

    @Test
    @DisplayName("Lớp miễn phí thì làm bài được ngay")
    void freeClassroomCanPracticeImmediately() {
        Classroom lopA = classroomOf(teacherA, "AAA111");

        when(settingsRepository.findById((byte) 1)).thenReturn(Optional.of(new TeacherSettings()));
        when(classroomRepository.findByJoinCode("AAA111")).thenReturn(Optional.of(lopA));
        when(memberRepository.findByClassroomIdAndUserId(anyString(), anyString()))
                .thenReturn(Optional.empty());
        when(memberRepository.countByClassroomIdAndStatus(anyString(), any())).thenReturn(0L);
        when(memberRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        ClassroomMember member = service.join(studentOfB, "AAA111");

        assertThat(member.getPaymentStatus()).isEqualTo(PaymentStatus.NOT_REQUIRED);
        assertThat(member.canPractice()).isTrue();
    }

    @Test
    @DisplayName("Mỗi giáo viên chỉ một lớp — gọi tạo lần hai trả lớp cũ")
    void createIsIdempotent() {
        Classroom existing = classroomOf(teacherA, "AAA111");
        when(classroomRepository.findByTeacherUserId(teacherA)).thenReturn(Optional.of(existing));

        Classroom result = service.createForTeacher(teacherA, "Lớp mới toanh");

        assertThat(result.getJoinCode()).isEqualTo("AAA111");
        verify(classroomRepository, never()).save(any());
    }
}
