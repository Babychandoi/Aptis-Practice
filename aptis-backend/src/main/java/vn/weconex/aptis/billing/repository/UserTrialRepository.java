package vn.weconex.aptis.billing.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.billing.domain.UserTrial;

public interface UserTrialRepository extends JpaRepository<UserTrial, String> {

    long countByUserIdAndCampaignId(String userId, String campaignId);

    List<UserTrial> findByUserIdOrderByCreatedAtDesc(String userId);

    /**
     * Job dọn lượt dùng thử hết hạn.
     */
    @Query("""
            SELECT t FROM UserTrial t
            WHERE t.status = :status AND t.endsAt <= :now
            """)
    List<UserTrial> findExpired(
            @Param("status") UserTrial.TrialStatus status, @Param("now") Instant now);
}
