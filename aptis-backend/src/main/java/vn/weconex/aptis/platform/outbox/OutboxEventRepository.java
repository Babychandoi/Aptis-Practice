package vn.weconex.aptis.platform.outbox;

import java.time.Instant;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.common.util.Enums.OutboxStatus;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, String> {

    @Query("""
            SELECT e FROM OutboxEvent e
            WHERE e.status = :status
              AND e.availableAt <= :now
            ORDER BY e.availableAt ASC
            """)
    List<OutboxEvent> findPending(
            @Param("status") OutboxStatus status,
            @Param("now") Instant now,
            Pageable pageable);
}
