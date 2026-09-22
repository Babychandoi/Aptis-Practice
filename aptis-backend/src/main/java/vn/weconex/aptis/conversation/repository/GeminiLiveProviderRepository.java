package vn.weconex.aptis.conversation.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.conversation.domain.GeminiLiveProvider;

public interface GeminiLiveProviderRepository extends JpaRepository<GeminiLiveProvider, String> {
    List<GeminiLiveProvider> findAllByOrderByPriorityAscCreatedAtAsc();
    List<GeminiLiveProvider> findByEnabledTrueOrderByPriorityAscCreatedAtAsc();
    boolean existsByNameIgnoreCase(String name);
}
