package vn.weconex.aptis.classroom.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/**
 * Lớp học của giáo viên.
 *
 * <p>Gom các entity nhỏ vào một file vì chúng chỉ có nghĩa khi đi cùng nhau,
 * giống cách {@code BillingEntities} đang làm.
 */
public final class ClassroomEntities {

    private ClassroomEntities() {
    }

    /**
     * Một lớp học.
     *
     * <p>Mỗi giáo viên đúng một lớp — ràng buộc UNIQUE ở DB, không chỉ ở code,
     * vì mọi truy vấn phía sau đều dựa vào giả định đó.
     */
    @Entity(name = "Classroom")
    @Table(name = "classrooms")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Classroom extends BaseEntity {

        public enum PricingType {
            FREE,
            PAID
        }

        public enum ClassroomStatus {
            ACTIVE,
            ARCHIVED
        }

        @Column(name = "teacher_user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String teacherUserId;

        @Column(name = "name", length = 255, nullable = false)
        private String name;

        @Column(name = "description", columnDefinition = "TEXT")
        private String description;

        /** Lịch học dạng chữ, ví dụ "Tối T3–T5–T7 · 19:30–21:00". */
        @Column(name = "schedule_note", length = 255)
        private String scheduleNote;

        /** Kênh liên hệ của chính giáo viên; để trống thì lớp không hiện khối hỗ trợ. */
        @Column(name = "support_zalo", length = 255)
        private String supportZalo;

        @Column(name = "support_facebook", length = 500)
        private String supportFacebook;

        @Column(name = "support_group", length = 500)
        private String supportGroup;

        @Column(name = "support_note", length = 500)
        private String supportNote;

        /** Mã 6 ký tự để học viên nhập tay hoặc quét QR. */
        @Column(name = "join_code", length = 6, nullable = false)
        private String joinCode;

        @Column(name = "join_enabled", nullable = false)
        private boolean joinEnabled = true;

        /** Nhập mã xong phải chờ giáo viên duyệt mới vào lớp. */
        @Column(name = "require_approval", nullable = false)
        private boolean requireApproval;

        /** Học viên thấy điểm của bạn cùng lớp. */
        @Column(name = "show_leaderboard", nullable = false)
        private boolean showLeaderboard;

        /** Mở đáp án bài giao sau khi hết hạn nộp. */
        @Column(name = "reveal_answers_after_due", nullable = false)
        private boolean revealAnswersAfterDue = true;

        /**
         * Lớp có được giao đề từ ngân hàng hệ thống không.
         *
         * <p>Admin bật/tắt. Tắt thì giáo viên chỉ giao được đề tự soạn, và học
         * viên chỉ làm được bài được giao.
         */
        @Column(name = "system_content_enabled", nullable = false)
        private boolean systemContentEnabled;

        @Enumerated(EnumType.STRING)
        @Column(name = "pricing_type", length = 8, nullable = false)
        private PricingType pricingType = PricingType.FREE;

        @Column(name = "price_amount", nullable = false)
        private long priceAmount;

        /** NULL = lấy mặc định trong teacher_settings. */
        @Column(name = "max_students")
        private Integer maxStudents;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private ClassroomStatus status = ClassroomStatus.ACTIVE;

        /** Hết hạn thì khoá lớp; null = không giới hạn. */
        @Column(name = "expires_at")
        private Instant expiresAt;

        public boolean isPaid() {
            return pricingType == PricingType.PAID && priceAmount > 0;
        }

        /**
         * Lớp đã quá hạn sử dụng chưa.
         *
         * <p>Quá hạn thì cả giáo viên lẫn học viên đều không vào được, chờ admin
         * gia hạn. Dữ liệu vẫn giữ nguyên.
         */
        public boolean isExpired() {
            return expiresAt != null && expiresAt.isBefore(Instant.now());
        }

        /** Lớp dùng được: đang hoạt động và còn hạn. */
        public boolean isUsable() {
            return status == ClassroomStatus.ACTIVE && !isExpired();
        }
    }

    /** Một học viên (hoặc trợ giảng) trong lớp. */
    @Entity(name = "ClassroomMember")
    @Table(name = "classroom_members")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ClassroomMember extends BaseEntity {

        public enum MemberRole {
            STUDENT,
            /** Trợ giảng: xem được, không sửa được. */
            ASSISTANT
        }

        public enum MemberStatus {
            /** Đã nhập mã, chờ giáo viên duyệt (lớp bật duyệt trước khi vào). */
            PENDING,
            ACTIVE,
            REJECTED,
            REMOVED
        }

        public enum PaymentStatus {
            /** Lớp miễn phí. */
            NOT_REQUIRED,
            PENDING,
            PAID
        }

        @Column(name = "classroom_id", columnDefinition = "CHAR(36)", nullable = false)
        private String classroomId;

        @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String userId;

        @Enumerated(EnumType.STRING)
        @Column(name = "role", length = 16, nullable = false)
        private MemberRole role = MemberRole.STUDENT;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private MemberStatus status = MemberStatus.ACTIVE;

        @Enumerated(EnumType.STRING)
        @Column(name = "payment_status", length = 16, nullable = false)
        private PaymentStatus paymentStatus = PaymentStatus.NOT_REQUIRED;

        @Column(name = "joined_at", nullable = false)
        private Instant joinedAt = Instant.now();

        @Column(name = "requested_at")
        private Instant requestedAt;

        @Column(name = "decided_by", columnDefinition = "CHAR(36)")
        private String decidedBy;

        /** Đã trả tiền hoặc lớp miễn phí — được làm bài. */
        public boolean canPractice() {
            return status == MemberStatus.ACTIVE && paymentStatus != PaymentStatus.PENDING;
        }
    }

    /** Cấu hình chung cho chương trình giáo viên — một dòng, id = 1. */
    @Entity(name = "TeacherSettings")
    @Table(name = "teacher_settings")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class TeacherSettings {

        @Id
        @Column(name = "id")
        private Byte id = 1;

        /** Phần trăm nền tảng giữ lại từ học phí lớp. */
        @Column(name = "platform_fee_percent", nullable = false)
        private int platformFeePercent = 10;

        @Column(name = "default_max_students", nullable = false)
        private int defaultMaxStudents = 50;

        @Column(name = "updated_at", nullable = false)
        private Instant updatedAt = Instant.now();
    }
}
