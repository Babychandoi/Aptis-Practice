package vn.weconex.aptis.classroom.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
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
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.TeacherSettings;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.repository.ClassroomRepository;
import vn.weconex.aptis.classroom.repository.TeacherSettingsRepository;
import vn.weconex.aptis.common.exception.ApiException;

/**
 * Hạn dùng lớp và trần sĩ số.
 *
 * <p>Hết hạn phải khoá cả hai phía: giáo viên không thao tác được, học viên
 * không vào được. Nhưng giáo viên vẫn phải mở được trang lớp để đọc thông báo
 * gia hạn — khoá kín quá thì họ không biết vì sao mất quyền.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClassroomExpiryTest {

    @Mock
    private ClassroomRepository classroomRepository;
    @Mock
    private ClassroomMemberRepository memberRepository;
    @Mock
    private TeacherSettingsRepository settingsRepository;

    @InjectMocks
    private ClassroomService service;

    private final String teacherId = UUID.randomUUID().toString();
    private final String classroomId = UUID.randomUUID().toString();

    private Classroom lop(Instant expiresAt) {
        Classroom c = new Classroom();
        c.setId(classroomId);
        c.setTeacherUserId(teacherId);
        c.setName("Lớp thử");
        c.setJoinCode("ABC123");
        c.setExpiresAt(expiresAt);
        when(classroomRepository.findByTeacherUserIdOrderByCreatedAtAsc(teacherId)).thenReturn(List.of(c));
        when(classroomRepository.findById(classroomId)).thenReturn(Optional.of(c));
        return c;
    }

    @Test
    @DisplayName("Lớp còn hạn thì giáo viên thao tác bình thường")
    void activeClassroomWorks() {
        lop(Instant.now().plus(30, ChronoUnit.DAYS));
        assertThatCode(() -> service.requireOwnedClassroom(teacherId)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Lớp không đặt hạn thì dùng vô thời hạn")
    void noExpiryMeansUnlimited() {
        Classroom c = lop(null);
        assertThat(c.isExpired()).isFalse();
        assertThatCode(() -> service.requireOwnedClassroom(teacherId)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Lớp hết hạn: giáo viên không thao tác được nữa")
    void expiredBlocksTeacher() {
        lop(Instant.now().minus(1, ChronoUnit.DAYS));

        assertThatThrownBy(() -> service.requireOwnedClassroom(teacherId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("hết hạn sử dụng");
    }

    @Test
    @DisplayName("Lớp hết hạn: giáo viên vẫn mở được trang để đọc thông báo")
    void expiredStillLetsTeacherSeePage() {
        lop(Instant.now().minus(1, ChronoUnit.DAYS));

        assertThatCode(() -> service.ownedClassroom(teacherId)).doesNotThrowAnyException();
        assertThat(service.ownedClassroom(teacherId).isExpired()).isTrue();
    }

    @Test
    @DisplayName("Lớp hết hạn: học viên không vào được")
    void expiredBlocksStudent() {
        lop(Instant.now().minus(1, ChronoUnit.DAYS));

        assertThatThrownBy(() -> service.requireUsableClassroom(classroomId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đang bị khoá");
    }

    @Test
    @DisplayName("Học viên mới không vào được lớp đã hết hạn")
    void cannotJoinExpiredClassroom() {
        Classroom c = lop(Instant.now().minus(1, ChronoUnit.DAYS));
        when(classroomRepository.findByJoinCode("ABC123")).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.join(UUID.randomUUID().toString(), "ABC123"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đang bị khoá");
    }

    @Test
    @DisplayName("Lớp đầy thì báo rõ, không cho vào thêm")
    void fullClassroomIsRejected() {
        Classroom c = lop(null);
        c.setMaxStudents(2);
        when(classroomRepository.findByJoinCode("ABC123")).thenReturn(Optional.of(c));
        when(memberRepository.findByClassroomIdAndUserId(anyId(), anyId()))
                .thenReturn(Optional.empty());
        when(memberRepository.countByClassroomIdAndStatus(classroomId, MemberStatus.ACTIVE))
                .thenReturn(2L);

        assertThatThrownBy(() -> service.join(UUID.randomUUID().toString(), "ABC123"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Lớp học đã đầy");
    }

    @Test
    @DisplayName("Gia hạn cộng từ hôm nay, không cộng dồn hạn cũ đã quá")
    void renewCountsFromToday() {
        lop(Instant.now().minus(100, ChronoUnit.DAYS));

        Classroom sau = service.setExpiry(classroomId, 30);

        assertThat(sau.getExpiresAt())
                .isAfter(Instant.now().plus(29, ChronoUnit.DAYS))
                .isBefore(Instant.now().plus(31, ChronoUnit.DAYS));
        assertThat(sau.isExpired()).isFalse();
    }

    @Test
    @DisplayName("Bỏ hạn thì lớp dùng vô thời hạn trở lại")
    void clearingExpiryUnlocks() {
        lop(Instant.now().minus(1, ChronoUnit.DAYS));

        Classroom sau = service.setExpiry(classroomId, null);

        assertThat(sau.getExpiresAt()).isNull();
        assertThat(sau.isExpired()).isFalse();
    }

    private static String anyId() {
        return org.mockito.ArgumentMatchers.anyString();
    }

    @SuppressWarnings("unused")
    private TeacherSettings settings() {
        TeacherSettings s = new TeacherSettings();
        s.setDefaultMaxStudents(50);
        return s;
    }
}
