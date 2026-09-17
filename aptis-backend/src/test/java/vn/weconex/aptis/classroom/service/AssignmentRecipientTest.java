package vn.weconex.aptis.classroom.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

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
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.Assignment;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.Assignment.AssignmentStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.MemberStatus;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.ClassroomMember.PaymentStatus;
import vn.weconex.aptis.classroom.repository.AssignmentQuestionSetRepository;
import vn.weconex.aptis.classroom.repository.AssignmentRecipientRepository;
import vn.weconex.aptis.classroom.repository.AssignmentRepository;
import vn.weconex.aptis.classroom.repository.AssignmentSubmissionRepository;
import vn.weconex.aptis.classroom.repository.ClassroomMemberRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.repository.TestBlueprintRepository;
import vn.weconex.aptis.practice.service.AttemptService;

/**
 * Bài giao cho một số học viên chỉ định.
 *
 * <p>Điểm dễ sai nhất: em không được giao vẫn vào làm được nếu đoán ra id bài.
 * Lọc danh sách ở giao diện là chưa đủ, phải chặn cả ở chỗ bắt đầu làm bài.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AssignmentRecipientTest {

    @Mock
    private AssignmentRepository assignmentRepository;
    @Mock
    private AssignmentQuestionSetRepository assignmentQuestionSetRepository;
    @Mock
    private AssignmentSubmissionRepository submissionRepository;
    @Mock
    private AssignmentRecipientRepository recipientRepository;
    @Mock
    private TestBlueprintRepository blueprintRepository;
    @Mock
    private ClassroomMemberRepository memberRepository;
    @Mock
    private QuestionSetRepository questionSetRepository;
    @Mock
    private AttemptService attemptService;

    @InjectMocks
    private AssignmentService service;

    private final String classroomId = UUID.randomUUID().toString();
    private final String duocGiao = UUID.randomUUID().toString();
    private final String khongDuocGiao = UUID.randomUUID().toString();

    private Assignment assignment(String id) {
        Assignment a = new Assignment();
        a.setId(id);
        a.setClassroomId(classroomId);
        a.setTitle("Bài Writing bổ sung");
        a.setStatus(AssignmentStatus.PUBLISHED);
        return a;
    }

    private void thanhVienHopLe(String userId) {
        ClassroomMember member = new ClassroomMember();
        member.setClassroomId(classroomId);
        member.setUserId(userId);
        member.setStatus(MemberStatus.ACTIVE);
        member.setPaymentStatus(PaymentStatus.NOT_REQUIRED);
        when(memberRepository.findByClassroomIdAndUserId(classroomId, userId))
                .thenReturn(Optional.of(member));
    }

    @Test
    @DisplayName("Em ngoài danh sách không vào làm được bài giao riêng")
    void outsiderCannotStart() {
        String assignmentId = UUID.randomUUID().toString();
        when(assignmentRepository.findById(assignmentId))
                .thenReturn(Optional.of(assignment(assignmentId)));
        thanhVienHopLe(khongDuocGiao);
        when(recipientRepository.countByAssignmentId(assignmentId)).thenReturn(2L);
        when(recipientRepository.existsByAssignmentIdAndUserId(assignmentId, khongDuocGiao))
                .thenReturn(false);

        assertThatThrownBy(() -> service.start(khongDuocGiao, assignmentId))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("không giao cho bạn");
    }

    @Test
    @DisplayName("Bài giao cả lớp thì ai trong lớp cũng làm được")
    void wholeClassAssignmentOpenToEveryone() {
        String assignmentId = UUID.randomUUID().toString();
        when(assignmentRepository.findById(assignmentId))
                .thenReturn(Optional.of(assignment(assignmentId)));
        thanhVienHopLe(khongDuocGiao);
        // Không có người nhận nào = cả lớp.
        when(recipientRepository.countByAssignmentId(assignmentId)).thenReturn(0L);
        when(submissionRepository.findByAssignmentIdAndUserId(assignmentId, khongDuocGiao))
                .thenReturn(Optional.empty());
        when(assignmentQuestionSetRepository.findByAssignmentIdOrderByDisplayOrder(assignmentId))
                .thenReturn(List.of());

        // Qua được chốt người nhận; dừng ở bước sau vì bài không có đề nào.
        assertThatThrownBy(() -> service.start(khongDuocGiao, assignmentId))
                .isInstanceOf(ApiException.class)
                .hasMessageNotContaining("không giao cho bạn");
    }

    @Test
    @DisplayName("Danh sách của học viên bỏ bài giao riêng cho người khác")
    void listHidesOthersPrivateAssignments() {
        Assignment caLop = assignment(UUID.randomUUID().toString());
        Assignment rieng = assignment(UUID.randomUUID().toString());
        when(assignmentRepository.findByClassroomIdAndStatusOrderByCreatedAtDesc(
                classroomId, AssignmentStatus.PUBLISHED))
                .thenReturn(List.of(caLop, rieng));
        when(recipientRepository.findAssignmentIdsWithRecipients(anyList()))
                .thenReturn(List.of(rieng.getId()));
        when(recipientRepository.findAssignmentIdsByUserId(khongDuocGiao))
                .thenReturn(List.of());
        when(recipientRepository.findAssignmentIdsByUserId(duocGiao))
                .thenReturn(List.of(rieng.getId()));

        assertThat(service.listForStudent(classroomId, khongDuocGiao))
                .extracting(Assignment::getId)
                .containsExactly(caLop.getId());

        assertThat(service.listForStudent(classroomId, duocGiao))
                .extracting(Assignment::getId)
                .containsExactlyInAnyOrder(caLop.getId(), rieng.getId());
    }

    @Test
    @DisplayName("Mẫu số là số em được giao, không phải sĩ số lớp")
    void recipientCountUsedAsDenominator() {
        String assignmentId = UUID.randomUUID().toString();
        when(recipientRepository.countByAssignmentId(assignmentId)).thenReturn(3L);
        assertThat(service.recipientCount(assignmentId, 50)).isEqualTo(3);

        String caLop = UUID.randomUUID().toString();
        when(recipientRepository.countByAssignmentId(caLop)).thenReturn(0L);
        assertThat(service.recipientCount(caLop, 50)).isEqualTo(50);
    }
}
