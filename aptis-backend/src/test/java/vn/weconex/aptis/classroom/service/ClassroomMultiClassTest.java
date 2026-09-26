package vn.weconex.aptis.classroom.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.TeacherSettings;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.classroom.repository.ClassroomRepository;
import vn.weconex.aptis.classroom.repository.TeacherSettingsRepository;
import vn.weconex.aptis.common.exception.ApiException;

/** Một giáo viên nhiều lớp (V64) và duyệt học viên trước khi vào lớp. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClassroomMultiClassTest {

    @Mock private ClassroomRepository classroomRepository;
    @Mock private ClassroomMemberRepository memberRepository;
    @Mock private TeacherSettingsRepository settingsRepository;
    @InjectMocks private ClassroomService service;

    private final String teacher = UUID.randomUUID().toString();

    @AfterEach
    void clearRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    private Classroom classroom(String code) {
        Classroom c = new Classroom();
        c.setId(UUID.randomUUID().toString());
        c.setTeacherUserId(teacher);
        c.setName("Lớp " + code);
        c.setJoinCode(code);
        return c;
    }

    private void selectClassroom(String id) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(TeacherClassroomContext.HEADER, id);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @Test
    void khongChonLopThiLayLopCuNhat() {
        Classroom first = classroom("AAA111");
        when(classroomRepository.findByTeacherUserIdOrderByCreatedAtAsc(teacher)).thenReturn(List.of(first, classroom("BBB222")));

        assertThat(service.ownedClassroom(teacher).getId()).isEqualTo(first.getId());
    }

    @Test
    void chonLopQuaHeaderThiLayDungLopDo() {
        Classroom second = classroom("BBB222");
        selectClassroom(second.getId());
        when(classroomRepository.findByIdAndTeacherUserId(second.getId(), teacher)).thenReturn(Optional.of(second));

        assertThat(service.ownedClassroom(teacher).getId()).isEqualTo(second.getId());
    }

    @Test
    void headerTroLopNguoiKhacThiBaoKhongTimThay() {
        String otherClass = UUID.randomUUID().toString();
        selectClassroom(otherClass);
        when(classroomRepository.findByIdAndTeacherUserId(otherClass, teacher)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.ownedClassroom(teacher)).isInstanceOf(ApiException.class);
    }

    @Test
    void lopBatDuyetThiHocVienVaoHangCho() {
        Classroom c = classroom("CCC333");
        c.setRequireApproval(true);
        when(classroomRepository.findByJoinCode("CCC333")).thenReturn(Optional.of(c));
        when(memberRepository.findByClassroomIdAndUserId(anyString(), anyString())).thenReturn(Optional.empty());
        when(settingsRepository.findById(any())).thenReturn(Optional.of(new TeacherSettings()));
        when(memberRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ClassroomMember member = service.join(UUID.randomUUID().toString(), "ccc333");

        assertThat(member.getStatus()).isEqualTo(MemberStatus.PENDING);
        assertThat(member.getRequestedAt()).isNotNull();
    }

    @Test
    void lopKhongBatDuyetThiVaoNgay() {
        Classroom c = classroom("DDD444");
        when(classroomRepository.findByJoinCode("DDD444")).thenReturn(Optional.of(c));
        when(memberRepository.findByClassroomIdAndUserId(anyString(), anyString())).thenReturn(Optional.empty());
        when(settingsRepository.findById(any())).thenReturn(Optional.of(new TeacherSettings()));
        when(memberRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.join(UUID.randomUUID().toString(), "DDD444").getStatus()).isEqualTo(MemberStatus.ACTIVE);
    }

    @Test
    void duyetYeuCauChuyenSangHocVienVaGhiNguoiDuyet() {
        Classroom c = classroom("EEE555");
        ClassroomMember pending = new ClassroomMember();
        pending.setId(UUID.randomUUID().toString());
        pending.setClassroomId(c.getId());
        pending.setStatus(MemberStatus.PENDING);
        when(classroomRepository.findByTeacherUserIdOrderByCreatedAtAsc(teacher)).thenReturn(List.of(c));
        when(memberRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        when(settingsRepository.findById(any())).thenReturn(Optional.of(new TeacherSettings()));

        ClassroomMember result = service.decideJoinRequest(teacher, pending.getId(), true);

        assertThat(result.getStatus()).isEqualTo(MemberStatus.ACTIVE);
        assertThat(result.getDecidedBy()).isEqualTo(teacher);
    }

    @Test
    void khongDuyetDuocYeuCauCuaLopKhac() {
        Classroom mine = classroom("FFF666");
        ClassroomMember foreign = new ClassroomMember();
        foreign.setId(UUID.randomUUID().toString());
        foreign.setClassroomId(UUID.randomUUID().toString());
        foreign.setStatus(MemberStatus.PENDING);
        when(classroomRepository.findByTeacherUserIdOrderByCreatedAtAsc(teacher)).thenReturn(List.of(mine));
        when(memberRepository.findById(foreign.getId())).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.decideJoinRequest(teacher, foreign.getId(), true)).isInstanceOf(ApiException.class);
    }
}
