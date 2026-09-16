package vn.weconex.aptis.classroom.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/** Nội dung riêng của lớp và bài giao. */
public final class ClassroomContentEntities {

    private ClassroomContentEntities() {
    }

    /** Tài liệu lớp — file tải lên hoặc link ngoài. */
    @Entity(name = "ClassroomMaterial")
    @Table(name = "classroom_materials")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ClassroomMaterial extends BaseEntity {

        public enum MaterialType {
            FILE,
            LINK
        }

        @Column(name = "classroom_id", columnDefinition = "CHAR(36)", nullable = false)
        private String classroomId;

        @Column(name = "created_by", columnDefinition = "CHAR(36)", nullable = false)
        private String createdBy;

        @Column(name = "title", length = 255, nullable = false)
        private String title;

        @Enumerated(EnumType.STRING)
        @Column(name = "material_type", length = 8, nullable = false)
        private MaterialType materialType = MaterialType.LINK;

        /** Khi FILE: trỏ sang assets (MinIO). */
        @Column(name = "asset_id", columnDefinition = "CHAR(36)")
        private String assetId;

        @Column(name = "link_url", length = 1000)
        private String linkUrl;
    }

    /** Thông báo chỉ học viên trong lớp thấy. */
    @Entity(name = "ClassroomPost")
    @Table(name = "classroom_posts")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ClassroomPost extends BaseEntity {

        public enum PostStatus {
            /** Đang soạn, chỉ giáo viên thấy. */
            DRAFT,
            PUBLISHED,
            HIDDEN
        }

        @Column(name = "classroom_id", columnDefinition = "CHAR(36)", nullable = false)
        private String classroomId;

        @Column(name = "created_by", columnDefinition = "CHAR(36)", nullable = false)
        private String createdBy;

        @Column(name = "title", length = 255, nullable = false)
        private String title;

        /** Tóm tắt ở danh sách; để trống thì giao diện tự cắt từ nội dung. */
        @Column(name = "excerpt", length = 500)
        private String excerpt;

        /** Markdown, hiển thị qua cùng bộ lọc an toàn với bài viết hệ thống. */
        @Column(name = "content", columnDefinition = "MEDIUMTEXT", nullable = false)
        private String content;

        @Column(name = "cover_asset_id", columnDefinition = "CHAR(36)")
        private String coverAssetId;

        @Column(name = "pinned", nullable = false)
        private boolean pinned;

        /** Lúc bài được đăng; null khi còn là nháp. */
        @Column(name = "published_at")
        private Instant publishedAt;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private PostStatus status = PostStatus.PUBLISHED;

        /** Học viên chỉ thấy bài đã đăng. */
        public boolean isVisibleToStudent() {
            return status == PostStatus.PUBLISHED;
        }
    }

    /** Nhận định riêng của giáo viên cho lớp. */
    @Entity(name = "ClassroomPrediction")
    @Table(name = "classroom_predictions")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ClassroomPrediction extends BaseEntity {

        public enum Priority {
            /** Khả năng ra cao. */
            HOT,
            /** Đề dự phòng. */
            BACKUP
        }

        public enum PredictionStatus {
            DRAFT,
            PUBLISHED
        }

        @Column(name = "classroom_id", columnDefinition = "CHAR(36)", nullable = false)
        private String classroomId;

        @Column(name = "created_by", columnDefinition = "CHAR(36)", nullable = false)
        private String createdBy;

        @Column(name = "component_id", columnDefinition = "CHAR(36)")
        private String componentId;

        /**
         * Chủ đề hệ thống — có thì học viên bấm vào là mở được đề để luyện.
         *
         * <p>Null vẫn hợp lệ: giáo viên có thể chỉ ghi một nhận định bằng chữ,
         * hoặc gắn đề đích danh qua {@code classroom_prediction_question_sets}.
         */
        @Column(name = "topic_id", columnDefinition = "CHAR(36)")
        private String topicId;

        /** Part cụ thể; null = lọc theo cả kỹ năng. */
        @Column(name = "part_id", columnDefinition = "CHAR(36)")
        private String partId;

        @Column(name = "predict_date")
        private LocalDate predictDate;

        @Enumerated(EnumType.STRING)
        @Column(name = "priority", length = 16, nullable = false)
        private Priority priority = Priority.HOT;

        /** Nhãn hiển thị; để trống thì giao diện lấy tên chủ đề. */
        @Column(name = "label", length = 255)
        private String label;

        @Column(name = "section_label", length = 64)
        private String sectionLabel;

        @Column(name = "source", length = 255)
        private String source;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private PredictionStatus status = PredictionStatus.PUBLISHED;

        @Column(name = "display_order", nullable = false)
        private int displayOrder;

        @Column(name = "title", length = 255, nullable = false)
        private String title;

        @Column(name = "content", columnDefinition = "MEDIUMTEXT")
        private String content;

        public boolean isVisibleToStudent() {
            return status == PredictionStatus.PUBLISHED;
        }
    }


    /** Bài giáo viên giao cho lớp. */
    @Entity(name = "Assignment")
    @Table(name = "assignments")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Assignment extends BaseEntity {

        public enum SourceType {
            /** Giao vài đề cụ thể, từ ngân hàng hoặc đề tự soạn. */
            QUESTION_SETS,
            /** Giao đề full 4 part. */
            BLUEPRINT
        }

        public enum AssignmentStatus {
            DRAFT,
            PUBLISHED,
            CLOSED
        }

        @Column(name = "classroom_id", columnDefinition = "CHAR(36)", nullable = false)
        private String classroomId;

        @Column(name = "created_by", columnDefinition = "CHAR(36)", nullable = false)
        private String createdBy;

        @Column(name = "title", length = 255, nullable = false)
        private String title;

        @Column(name = "instructions", columnDefinition = "TEXT")
        private String instructions;

        @Enumerated(EnumType.STRING)
        @Column(name = "source_type", length = 20, nullable = false)
        private SourceType sourceType = SourceType.QUESTION_SETS;

        @Column(name = "blueprint_id", columnDefinition = "CHAR(36)")
        private String blueprintId;

        /** NULL = không hạn nộp. */
        @Column(name = "due_at")
        private Instant dueAt;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private AssignmentStatus status = AssignmentStatus.PUBLISHED;

        public boolean isOverdue() {
            return dueAt != null && Instant.now().isAfter(dueAt);
        }

        public boolean isOpen() {
            return status == AssignmentStatus.PUBLISHED;
        }
    }

    /** Bài nộp của một học viên cho một bài giao. */
    @Entity(name = "AssignmentSubmission")
    @Table(name = "assignment_submissions")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class AssignmentSubmission extends BaseEntity {

        public enum SubmissionStatus {
            NOT_STARTED,
            IN_PROGRESS,
            SUBMITTED,
            /** Nộp sau hạn. */
            LATE,
            GRADED
        }

        @Column(name = "assignment_id", columnDefinition = "CHAR(36)", nullable = false)
        private String assignmentId;

        @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String userId;

        /** Lượt làm bài tương ứng; NULL khi chưa bắt đầu. */
        @Column(name = "attempt_id", columnDefinition = "CHAR(36)")
        private String attemptId;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private SubmissionStatus status = SubmissionStatus.NOT_STARTED;

        @Column(name = "submitted_at")
        private Instant submittedAt;

        /** NULL = giữ điểm AI; có giá trị là giáo viên đã ghi đè. */
        @Column(name = "teacher_score", precision = 8, scale = 2)
        private BigDecimal teacherScore;

        @Column(name = "teacher_comment", columnDefinition = "TEXT")
        private String teacherComment;

        @Column(name = "graded_by", columnDefinition = "CHAR(36)")
        private String gradedBy;

        @Column(name = "graded_at")
        private Instant gradedAt;
    }
}
