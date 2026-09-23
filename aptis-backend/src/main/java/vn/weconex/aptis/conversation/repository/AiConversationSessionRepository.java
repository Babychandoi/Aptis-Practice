package vn.weconex.aptis.conversation.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.conversation.domain.AiConversationSession;

public interface AiConversationSessionRepository extends JpaRepository<AiConversationSession, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM AiConversationSession s WHERE s.id = :id AND s.userId = :userId")
    Optional<AiConversationSession> findOwnedForUpdate(@Param("userId") String userId, @Param("id") String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AiConversationSession> findFirstByUserIdOrderByStartedAtDesc(String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT s FROM AiConversationSession s
        WHERE s.userId = :userId AND s.status IN ('CREATED','ACTIVE','HANDOFF')
          AND s.expiresAt > :now ORDER BY s.startedAt DESC
        """)
    List<AiConversationSession> findLive(@Param("userId") String userId, @Param("now") Instant now);

    @Query("""
        SELECT s FROM AiConversationSession s
        WHERE s.userId = :userId AND s.startedAt < :dayEnd
          AND (s.endedAt IS NULL OR s.endedAt > :dayStart)
        """)
    List<AiConversationSession> findOverlappingDay(@Param("userId") String userId,
            @Param("dayStart") Instant dayStart, @Param("dayEnd") Instant dayEnd);

    long countByUserIdAndCreatedAtAfter(String userId, Instant after);
    long countByProviderIdAndStatusInAndExpiresAtAfter(String providerId, List<String> statuses, Instant now);
}
