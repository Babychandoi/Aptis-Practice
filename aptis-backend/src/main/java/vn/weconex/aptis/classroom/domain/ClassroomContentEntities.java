package vn.weconex.aptis.classroom.domain;

import java.math.BigDecimal;
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
            PUBLISHED,
            HIDDEN
        }

        @Column(name = "classroom_id", columnDefinition = "CHAR(36)", nullable = false)
        private String classroomId;

        @Column(name = "created_by", columnDefinition = "CHAR(36)", nullable = false)
        private String createdBy;

        @Column(name = "title", length = 255, nullable = false)
        private String title;

        @Column(name = "content", columnDefinition = "MEDIUMTEXT", nullable = false)
        private String content;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private PostStatus status = PostStatus.PUBLISHED;
    }

    /** Nhận định riêng của giáo viên cho lớp. */
    @Entity(name = "ClassroomPrediction")
    @Table(name = "classroom_predictions")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ClassroomPrediction extends BaseEntity {

        @Column(name = "classroom_id", columnDefinition = "CHAR(36)", nullable = false)
        private String classroomId;

        @Column(name = "created_by", columnDefinition = "CHAR(36)", nullable = false)
        private String createdBy;

        @Column(name = "component_id", columnDefinition = "CHAR(36)")
        private String componentId;

        @Column(name = "title", length = 255, nullable = false)
        private String title;

        @Column(name = "content", columnDefinition = "MEDIUMTEXT")
        private String content;
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
