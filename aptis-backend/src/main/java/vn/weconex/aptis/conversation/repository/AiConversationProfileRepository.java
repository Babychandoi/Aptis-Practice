package vn.weconex.aptis.conversation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.conversation.domain.AiConversationProfile;

public interface AiConversationProfileRepository
        extends JpaRepository<AiConversationProfile, String> {
}
