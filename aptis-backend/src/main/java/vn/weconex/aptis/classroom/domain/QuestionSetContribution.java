package vn.weconex.aptis.classroom.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/**
 * Giáo viên đề xuất đề của mình vào ngân hàng đề chung.
 *
 * <p>Đề tự soạn dùng ngay trong lớp không cần ai duyệt. Nhưng đưa vào kho chung
 * thì mọi học viên đều thấy, nên phải qua admin.
 */
@Entity(name = "QuestionSetContribution")
@Table(name = "question_set_contributions")
@Getter
@Setter
@NoArgsConstructor
public class QuestionSetContribution extends BaseEntity {

    public enum ContributionStatus {
        PENDING,
        ACCEPTED,
        REJECTED
    }

    @Column(name = "question_set_id", columnDefinition = "CHAR(36)", nullable = false)
    private String questionSetId;

    @Column(name = "teacher_user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String teacherUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private ContributionStatus status = ContributionStatus.PENDING;

    /** Lời nhắn của giáo viên khi gửi. */
    @Column(name = "note", length = 1000)
    private String note;

    /** Lý do admin từ chối, để giáo viên biết đường sửa. */
    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Column(name = "reviewed_by", columnDefinition = "CHAR(36)")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;
}
