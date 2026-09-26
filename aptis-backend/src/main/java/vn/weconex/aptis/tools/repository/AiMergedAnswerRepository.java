package vn.weconex.aptis.tools.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.tools.domain.AiMergedAnswer;

public interface AiMergedAnswerRepository extends JpaRepository<AiMergedAnswer, String> {

    Optional<AiMergedAnswer> findByUserIdAndSetKey(String userId, String setKey);

    long countByUserIdAndCreatedAtAfter(String userId, Instant after);

    List<AiMergedAnswer> findTop20ByUserIdOrderByCreatedAtDesc(String userId);
}
