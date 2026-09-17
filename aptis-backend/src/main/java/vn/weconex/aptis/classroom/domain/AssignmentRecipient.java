package vn.weconex.aptis.classroom.domain;

import java.io.Serializable;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Học viên được chỉ định cho một bài giao.
 *
 * <p>Không có dòng nào cho một bài giao nghĩa là bài đó giao cho cả lớp.
 *
 * <p>Bảng nối khoá kép nên tách file riêng: {@code @IdClass} không dùng được
 * với entity lồng trong class bọc.
 */
@Entity(name = "AssignmentRecipient")
@Table(name = "assignment_recipients")
@IdClass(AssignmentRecipient.Key.class)
@Getter
@Setter
@NoArgsConstructor
public class AssignmentRecipient {

    @Id
    @Column(name = "assignment_id", columnDefinition = "CHAR(36)")
    private String assignmentId;

    @Id
    @Column(name = "user_id", columnDefinition = "CHAR(36)")
    private String userId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public AssignmentRecipient(String assignmentId, String userId) {
        this.assignmentId = assignmentId;
        this.userId = userId;
        this.createdAt = Instant.now();
    }

    /** Khoá kép. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {

        private String assignmentId;
        private String userId;
    }
}
