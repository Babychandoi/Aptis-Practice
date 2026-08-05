package vn.weconex.aptis.progress.domain;

import java.io.Serializable;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Thống kê từng bộ câu hỏi của một học viên. Dùng cho luồng chọn câu hỏi và
 * trang "Câu đã sai".
 */
@Entity
@Table(name = "user_question_stats")
@Getter
@Setter
@NoArgsConstructor
public class UserQuestionStats {

    @EmbeddedId
    private Key key;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "correct_count", nullable = false)
    private int correctCount;

    @Column(name = "incorrect_count", nullable = false)
    private int incorrectCount;

    /**
     * 0..1 — tỉ lệ nắm vững, dùng để xếp ưu tiên luyện lại.
     *
     * <p>Field dùng double cho tiện tính toán, nhưng cột SQL là DECIMAL(8,4)
     * nên phải khai báo columnDefinition: Hibernate mặc định map double sang
     * float(53) và ddl-auto=validate sẽ báo lệch kiểu. Không dùng
     * precision/scale vì hai thuộc tính đó chỉ có nghĩa với BigDecimal.
     */
    @Column(name = "mastery_score", columnDefinition = "DECIMAL(8,4)", nullable = false)
    private double masteryScore;

    @Column(name = "average_score", columnDefinition = "DECIMAL(8,4)", nullable = false)
    private double averageScore;

    @Column(name = "last_attempted_at")
    private Instant lastAttemptedAt;

    @Column(name = "last_correct_at")
    private Instant lastCorrectAt;

    @Column(name = "last_incorrect_at")
    private Instant lastIncorrectAt;

    @Column(name = "next_review_at")
    private Instant nextReviewAt;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {

        @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
        private String userId;

        @Column(name = "question_set_id", columnDefinition = "CHAR(36)", nullable = false)
        private String questionSetId;

        @Override
        public boolean equals(Object other) {
            if (this == other) {
                return true;
            }
            if (!(other instanceof Key that)) {
                return false;
            }
            return Objects.equals(userId, that.userId)
                    && Objects.equals(questionSetId, that.questionSetId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, questionSetId);
        }
    }

    public static UserQuestionStats create(String userId, String questionSetId) {
        UserQuestionStats stats = new UserQuestionStats();
        stats.key = new Key(userId, questionSetId);
        return stats;
    }

    /**
     * Cập nhật sau một lần làm. Lịch ôn dùng khoảng cách tăng dần (spaced
     * repetition đơn giản): làm đúng thì giãn ra, làm sai thì ôn lại sau 1 ngày.
     */
    public void record(double ratio, Instant at) {
        attemptCount++;
        lastAttemptedAt = at;

        boolean correct = ratio >= 1.0;
        if (correct) {
            correctCount++;
            lastCorrectAt = at;
        } else {
            incorrectCount++;
            lastIncorrectAt = at;
        }

        // Trung bình động: điểm mới có trọng số 30%
        averageScore = attemptCount == 1 ? ratio : averageScore * 0.7 + ratio * 0.3;
        masteryScore = attemptCount == 0 ? 0 : (double) correctCount / attemptCount;
        nextReviewAt = at.plus(nextInterval(correct));
    }

    private Duration nextInterval(boolean correct) {
        if (!correct) {
            return Duration.ofDays(1);
        }
        // 1 → 3 → 7 → 14 → 30 ngày, chặn trên ở 30
        int streak = Math.max(1, correctCount);
        return switch (Math.min(streak, 5)) {
            case 1 -> Duration.ofDays(3);
            case 2 -> Duration.ofDays(7);
            case 3 -> Duration.ofDays(14);
            default -> Duration.ofDays(30);
        };
    }
}
