package vn.weconex.aptis.practice.domain;

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
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.AttemptStatus;
import vn.weconex.aptis.common.util.Enums.CefrLevel;
import vn.weconex.aptis.common.util.Enums.PracticeMode;

/**
 * Một lượt làm bài. Nội dung câu hỏi và câu trả lời chi tiết nằm ở MongoDB
 * ({@code attempt_documents}) với cùng id; bảng này giữ trạng thái và điểm
 * tổng hợp.
 *
 * <p>Dùng String id (không @ManyToOne) cho blueprint/component/part để tránh
 * lazy-load khi chỉ cần id trong luồng làm bài.
 */
@Entity
@Table(name = "test_attempts")
@Getter
@Setter
@NoArgsConstructor
public class TestAttempt extends BaseEntity {

    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;

    @Column(name = "blueprint_id", columnDefinition = "CHAR(36)")
    private String blueprintId;

    @Column(name = "component_id", columnDefinition = "CHAR(36)")
    private String componentId;

    @Column(name = "part_id", columnDefinition = "CHAR(36)")
    private String partId;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", length = 20, nullable = false)
    private PracticeMode mode;

    /** Mức quyền đã dùng lúc tạo lượt — giữ lại để đối soát về sau. */
    @Enumerated(EnumType.STRING)
    @Column(name = "access_level_used", length = 10, nullable = false)
    private AccessLevel accessLevelUsed;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private AttemptStatus status = AttemptStatus.CREATED;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "time_spent_seconds", nullable = false)
    private int timeSpentSeconds;

    @Column(name = "raw_score", precision = 10, scale = 2)
    private BigDecimal rawScore;

    @Column(name = "max_score", precision = 10, scale = 2)
    private BigDecimal maxScore;

    @Column(name = "percentage_score", precision = 8, scale = 4)
    private BigDecimal percentageScore;

    @Column(name = "scaled_score", precision = 10, scale = 2)
    private BigDecimal scaledScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "cefr_level", length = 4)
    private CefrLevel cefrLevel;

    @Column(name = "total_items", nullable = false)
    private int totalItems;

    @Column(name = "answered_items", nullable = false)
    private int answeredItems;

    @Column(name = "correct_items", nullable = false)
    private int correctItems;

    @Column(name = "incorrect_items", nullable = false)
    private int incorrectItems;

    public boolean isOwnedBy(String candidateUserId) {
        return userId.equals(candidateUserId);
    }

    public boolean isExpired(Instant at) {
        return expiresAt != null && expiresAt.isBefore(at);
    }

    public void start(Integer durationSeconds, Instant expiryGraceEnd) {
        this.status = AttemptStatus.IN_PROGRESS;
        this.startedAt = Instant.now();
        this.durationSeconds = durationSeconds;
        this.expiresAt = expiryGraceEnd;
    }

    /**
     * @param reportedSeconds tổng thời gian client báo qua autosave; dùng làm
     *     nguồn chính vì học viên có thể mở tab rồi đi làm việc khác, khi đó
     *     hiệu submittedAt - startedAt không phản ánh thời gian thực học.
     *     Chặn trên bằng wall-clock để client không báo số vô lý.
     */
    public void submit(int reportedSeconds) {
        this.status = AttemptStatus.SUBMITTED;
        this.submittedAt = Instant.now();

        int wallClock = startedAt == null
                ? 0
                : (int) (submittedAt.getEpochSecond() - startedAt.getEpochSecond());

        // Không thể học lâu hơn khoảng thời gian từ lúc bắt đầu tới lúc nộp
        this.timeSpentSeconds = reportedSeconds > 0
                ? Math.min(reportedSeconds, wallClock)
                : wallClock;
    }

    public void markScoring() {
        this.status = AttemptStatus.SCORING;
    }

    public void complete(BigDecimal rawScore, BigDecimal maxScore) {
        this.status = AttemptStatus.COMPLETED;
        this.completedAt = Instant.now();
        this.rawScore = rawScore;
        this.maxScore = maxScore;
        this.percentageScore = computePercentage(rawScore, maxScore);
    }

    private static BigDecimal computePercentage(BigDecimal raw, BigDecimal max) {
        if (raw == null || max == null || max.signum() == 0) {
            return null;
        }
        return raw.multiply(BigDecimal.valueOf(100))
                .divide(max, 4, java.math.RoundingMode.HALF_UP);
    }
}
