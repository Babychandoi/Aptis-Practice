package vn.weconex.aptis.content.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.content.domain.QuestionSet;

public interface QuestionSetRepository
        extends JpaRepository<QuestionSet, String>, JpaSpecificationExecutor<QuestionSet> {

    Optional<QuestionSet> findByCode(String code);

    boolean existsByCode(String code);

    Page<QuestionSet> findByPartIdAndStatus(String partId, ContentStatus status, Pageable pageable);

    /**
     * Chọn bộ câu hỏi cho luyện theo Part, ưu tiên theo PHẦN IX §56:
     * chưa làm -> đến lịch ôn -> mastery thấp -> lâu chưa gặp.
     *
     * <p>{@code hasPremium} quyết định có lấy nội dung PREMIUM hay không —
     * kiểm tra ở backend, không tin frontend.
     *
     * <p>{@code excludedIds} là các bộ vừa làm trong cửa sổ tránh lặp; truyền
     * một phần tử giả khi rỗng vì MySQL không nhận {@code IN ()}.
     */
    @Query(value = """
            SELECT qs.id
            FROM question_sets qs
            LEFT JOIN user_question_stats uqs
                   ON uqs.question_set_id = qs.id
                  AND uqs.user_id = :userId
            WHERE qs.part_id = :partId
              AND qs.status = 'PUBLISHED'
              AND (qs.access_level = 'FREE' OR :hasPremium = TRUE)
              AND qs.id NOT IN (:excludedIds)
            ORDER BY
                CASE WHEN uqs.attempt_count IS NULL THEN 0 ELSE 1 END,
                CASE WHEN uqs.next_review_at IS NOT NULL
                       AND uqs.next_review_at <= UTC_TIMESTAMP()
                     THEN 0 ELSE 1 END,
                COALESCE(uqs.mastery_score, 0) ASC,
                COALESCE(uqs.last_attempted_at, '1970-01-01') ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<String> selectForPartPractice(
            @Param("userId") String userId,
            @Param("partId") String partId,
            @Param("hasPremium") boolean hasPremium,
            @Param("excludedIds") List<String> excludedIds,
            @Param("limit") int limit);

    /**
     * Biến thể cho thi thử: lọc thêm theo khoảng độ khó của blueprint rule.
     */
    @Query(value = """
            SELECT qs.id
            FROM question_sets qs
            LEFT JOIN user_question_stats uqs
                   ON uqs.question_set_id = qs.id
                  AND uqs.user_id = :userId
            WHERE qs.part_id = :partId
              AND qs.status = 'PUBLISHED'
              AND (:allowFree = TRUE OR qs.access_level <> 'FREE')
              AND (:allowPremium = TRUE OR qs.access_level <> 'PREMIUM')
              AND (qs.access_level = 'FREE' OR :hasPremium = TRUE)
              AND (:difficultyMin IS NULL OR qs.difficulty >= :difficultyMin)
              AND (:difficultyMax IS NULL OR qs.difficulty <= :difficultyMax)
              AND qs.id NOT IN (:excludedIds)
            ORDER BY
                CASE WHEN :strategy = 'NEW_FIRST'
                     THEN CASE WHEN uqs.attempt_count IS NULL THEN 0 ELSE 1 END
                     ELSE 0 END,
                CASE WHEN :strategy = 'WEAK_FIRST'
                     THEN COALESCE(uqs.mastery_score, 0)
                     ELSE 0 END,
                RAND(:seed)
            LIMIT :limit
            """, nativeQuery = true)
    List<String> selectForBlueprintRule(
            @Param("userId") String userId,
            @Param("partId") String partId,
            @Param("hasPremium") boolean hasPremium,
            @Param("allowFree") boolean allowFree,
            @Param("allowPremium") boolean allowPremium,
            @Param("difficultyMin") Integer difficultyMin,
            @Param("difficultyMax") Integer difficultyMax,
            @Param("strategy") String strategy,
            @Param("excludedIds") List<String> excludedIds,
            @Param("seed") long seed,
            @Param("limit") int limit);

    /**
     * Các bộ câu hỏi user đã làm gần đây, dùng để hạn chế lặp (PHẦN IX §57).
     */
    @Query(value = """
            SELECT DISTINCT aqs.question_set_id
            FROM attempt_question_sets aqs
            JOIN test_attempts ta ON ta.id = aqs.attempt_id
            WHERE ta.user_id = :userId
              AND ta.created_at >= :since
            """, nativeQuery = true)
    List<String> findRecentlyUsedQuestionSetIds(
            @Param("userId") String userId,
            @Param("since") java.time.Instant since);

    long countByPartIdAndStatus(String partId, ContentStatus status);
}
