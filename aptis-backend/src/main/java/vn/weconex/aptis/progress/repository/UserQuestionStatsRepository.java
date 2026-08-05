package vn.weconex.aptis.progress.repository;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.progress.domain.UserQuestionStats;

public interface UserQuestionStatsRepository
        extends JpaRepository<UserQuestionStats, UserQuestionStats.Key> {

    /**
     * Projection để đọc thống kê mà không nạp cả entity.
     */
    interface StatsView {
        String getQuestionSetId();

        int getAttemptCount();

        int getIncorrectCount();

        double getMasteryScore();

        Instant getLastAttemptedAt();

        Instant getNextReviewAt();
    }

    @Query(value = """
            SELECT question_set_id AS questionSetId,
                   attempt_count   AS attemptCount,
                   incorrect_count AS incorrectCount,
                   mastery_score   AS masteryScore,
                   last_attempted_at AS lastAttemptedAt,
                   next_review_at  AS nextReviewAt
            FROM user_question_stats
            WHERE user_id = :userId
              AND question_set_id IN (:questionSetIds)
            """, nativeQuery = true)
    List<StatsView> findStatsFor(
            @Param("userId") String userId,
            @Param("questionSetIds") List<String> questionSetIds);

    @Query(value = """
            SELECT question_set_id
            FROM user_question_stats
            WHERE user_id = :userId
              AND question_set_id IN (:questionSetIds)
            """, nativeQuery = true)
    Set<String> findAttemptedQuestionSetIds(
            @Param("userId") String userId,
            @Param("questionSetIds") List<String> questionSetIds);

    /**
     * Câu đã sai trong một Part, chưa làm đúng lại (PHẦN IX §58).
     */
    @Query(value = """
            SELECT uqs.question_set_id
            FROM user_question_stats uqs
            JOIN question_sets qs ON qs.id = uqs.question_set_id
            WHERE uqs.user_id = :userId
              AND qs.part_id = :partId
              AND qs.status = 'PUBLISHED'
              AND uqs.incorrect_count > 0
              AND (uqs.last_correct_at IS NULL
                   OR uqs.last_incorrect_at > uqs.last_correct_at)
            ORDER BY uqs.mastery_score ASC, uqs.last_incorrect_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<String> findIncorrectQuestionSetIdsByPart(
            @Param("userId") String userId,
            @Param("partId") String partId,
            @Param("limit") int limit);

    /**
     * Trang "Câu đã sai" toàn hệ thống, lọc tùy chọn theo component.
     */
    @Query(value = """
            SELECT uqs.question_set_id
            FROM user_question_stats uqs
            JOIN question_sets qs ON qs.id = uqs.question_set_id
            JOIN parts p ON p.id = qs.part_id
            WHERE uqs.user_id = :userId
              AND qs.status = 'PUBLISHED'
              AND uqs.incorrect_count > 0
              AND (uqs.last_correct_at IS NULL
                   OR uqs.last_incorrect_at > uqs.last_correct_at)
              AND (:componentId IS NULL OR p.component_id = :componentId)
            ORDER BY uqs.last_incorrect_at DESC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<String> findIncorrectQuestionSetIds(
            @Param("userId") String userId,
            @Param("componentId") String componentId,
            @Param("limit") int limit,
            @Param("offset") int offset);
}
