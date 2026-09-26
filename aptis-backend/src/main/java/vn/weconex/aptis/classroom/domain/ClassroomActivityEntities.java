package vn.weconex.aptis.classroom.domain;

import java.io.Serializable;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

/** Hoạt động trong lớp: lịch học, điểm danh, đã xem và bình luận bảng tin (V64). */
public final class ClassroomActivityEntities {

    private ClassroomActivityEntities() {
    }

    /** Một buổi học. Link họp do giáo viên dán, hệ thống không tự tạo phòng. */
    @Entity(name = "ClassroomSession")
    @Table(name = "classroom_sessions")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ClassroomSession extends BaseEntity {

        public enum SessionStatus { SCHEDULED, CANCELLED }

        @Column(name = "classroom_id", columnDefinition = "CHAR(36)", nullable = false)
        private String classroomId;

        @Column(name = "starts_at", nullable = false)
        private Instant startsAt;

        @Column(name = "ends_at", nullable = false)
        private Instant endsAt;

        @Column(name = "topic", length = 255, nullable = false)
        private String topic;

        @Column(name = "meeting_url", length = 1000)
        private String meetingUrl;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private SessionStatus status = SessionStatus.SCHEDULED;

        @Column(name = "created_by", columnDefinition = "CHAR(36)", nullable = false)
        private String createdBy;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class SessionUserKey implements Serializable {
        private String sessionId;
        private String userId;
    }

    /** Điểm danh một học viên ở một buổi; giáo viên tự tích. */
    @Entity(name = "ClassroomSessionAttendance")
    @Table(name = "classroom_session_attendance")
    @IdClass(SessionUserKey.class)
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SessionAttendance {

        @Id
        @Column(name = "session_id", columnDefinition = "CHAR(36)")
        private String sessionId;

        @Id
        @Column(name = "user_id", columnDefinition = "CHAR(36)")
        private String userId;

        @Column(name = "present", nullable = false)
        private boolean present;

        @Column(name = "marked_at", nullable = false)
        private Instant markedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class PostUserKey implements Serializable {
        private String postId;
        private String userId;
    }

    /** Học viên đã mở một bài bảng tin, cho dòng "3/18 đã xem". */
    @Entity(name = "ClassroomPostRead")
    @Table(name = "classroom_post_reads")
    @IdClass(PostUserKey.class)
    @Getter
    @Setter
    @NoArgsConstructor
    public static class PostRead {

        @Id
        @Column(name = "post_id", columnDefinition = "CHAR(36)")
        private String postId;

        @Id
        @Column(name = "user_id", columnDefinition = "CHAR(36)")
        private String userId;

        @Column(name = "read_at", nullable = false)
        private Instant readAt;
    }

    /** Bình luận trong bảng tin lớp; hiện ngay, giáo viên ẩn được. */
    @Entity(name = "ClassroomPostComment")
    @Table(name = "classroom_post_comments")
    @Getter
    @Setter
    @NoArgsConstructor
    public static class PostComment extends BaseEntity {

        public enum CommentStatus { VISIBLE, HIDDEN }

        @Column(name = "post_id", columnDefinition = "CHAR(36)", nullable = false)
        private String postId;

        @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String userId;

        @Column(name = "body", length = 2000, nullable = false)
        private String body;

        @Enumerated(EnumType.STRING)
        @Column(name = "status", length = 16, nullable = false)
        private CommentStatus status = CommentStatus.VISIBLE;
    }
}
