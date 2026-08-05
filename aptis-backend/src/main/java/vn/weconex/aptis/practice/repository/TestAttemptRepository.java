package vn.weconex.aptis.practice.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.common.util.Enums.AttemptStatus;
import vn.weconex.aptis.practice.domain.TestAttempt;

public interface TestAttemptRepository extends JpaRepository<TestAttempt, String> {

    Page<TestAttempt> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<TestAttempt> findByUserIdAndStatusOrderByCreatedAtDesc(
            String userId, AttemptStatus status, Pageable pageable);

    /**
     * Khóa bản ghi khi nộp bài để hai request submit song song không cùng chấm.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM TestAttempt a WHERE a.id = :id")
    Optional<TestAttempt> findByIdForUpdate(@Param("id") String id);

    /**
     * Lượt đang làm dở của user cho cùng một Part — dùng để nối lại thay vì
     * tạo lượt mới.
     */
    @Query("""
            SELECT a FROM TestAttempt a
            WHERE a.userId = :userId
              AND a.partId = :partId
              AND a.status IN :openStatuses
            ORDER BY a.createdAt DESC
            """)
    List<TestAttempt> findOpenForPart(
            @Param("userId") String userId,
            @Param("partId") String partId,
            @Param("openStatuses") List<AttemptStatus> openStatuses);

    /**
     * Job dọn lượt quá hạn.
     */
    @Query("""
            SELECT a FROM TestAttempt a
            WHERE a.status IN :openStatuses
              AND a.expiresAt IS NOT NULL
              AND a.expiresAt < :now
            """)
    List<TestAttempt> findExpired(
            @Param("openStatuses") List<AttemptStatus> openStatuses,
            @Param("now") Instant now);

    long countByUserIdAndStatus(String userId, AttemptStatus status);
}
