package vn.weconex.aptis.classroom.web;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.service.ClassroomService;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.practice.repository.TestAttemptRepository;
import vn.weconex.aptis.practice.service.AttemptService;

/**
 * Giáo viên chỉ xem được bài của học viên lớp mình.
 *
 * <p>Đây là rò rỉ nghiêm trọng nhất tính năng này có thể gây ra: bài làm kèm
 * câu trả lời và điểm số của người học lớp khác. Chặn nằm ở chỗ lớp tra từ tài
 * khoản đang đăng nhập chứ không nhận từ client.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TeacherMonitorBoundaryTest {

    @Mock
    private ClassroomService classroomService;
    @Mock
    private ClassroomMemberRepository memberRepository;
    @Mock
    private TestAttemptRepository attemptRepository;
    @Mock
    private AttemptService attemptService;
    @Mock
    private CurrentUser currentUser;

    @InjectMocks
    private TeacherMonitorController controller;

    private final String teacherId = UUID.randomUUID().toString();
    private final String classroomId = UUID.randomUUID().toString();
    private final String hocVienLopKhac = UUID.randomUUID().toString();

    private void lopCuaToi() {
        Classroom classroom = new Classroom();
        classroom.setId(classroomId);
        classroom.setTeacherUserId(teacherId);
        when(currentUser.requireUserId()).thenReturn(teacherId);
        when(classroomService.requireOwnedClassroom(teacherId)).thenReturn(classroom);
    }

    @Test
    @DisplayName("Không xem được lịch sử của học viên lớp khác")
    void cannotListOtherClassStudent() {
        lopCuaToi();
        when(memberRepository.findByClassroomIdAndUserId(classroomId, hocVienLopKhac))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.attempts(hocVienLopKhac, 0, 20))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("không ở trong lớp của bạn");

        verify(attemptRepository, never()).findByUserIdOrderByCreatedAtDesc(anyString(), any());
    }

    @Test
    @DisplayName("Không xem được chi tiết bài của học viên lớp khác")
    void cannotOpenOtherClassAttempt() {
        lopCuaToi();
        when(memberRepository.findByClassroomIdAndUserId(classroomId, hocVienLopKhac))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                controller.attemptDetail(hocVienLopKhac, UUID.randomUUID().toString()))
                .isInstanceOf(ApiException.class);

        verify(attemptService, never()).getAttempt(anyString(), anyString());
    }

    @Test
    @DisplayName("Học viên đã rời lớp cũng không xem được nữa")
    void removedStudentIsBlocked() {
        lopCuaToi();
        ClassroomMember daRoi = new ClassroomMember();
        daRoi.setClassroomId(classroomId);
        daRoi.setUserId(hocVienLopKhac);
        daRoi.setStatus(MemberStatus.REMOVED);
        when(memberRepository.findByClassroomIdAndUserId(classroomId, hocVienLopKhac))
                .thenReturn(Optional.of(daRoi));

        assertThatThrownBy(() -> controller.attempts(hocVienLopKhac, 0, 20))
                .isInstanceOf(ApiException.class);
    }

    private static org.springframework.data.domain.Pageable any() {
        return org.mockito.ArgumentMatchers.any();
    }
}
