package vn.weconex.aptis.billing.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.TrialCampaign;

public interface TrialCampaignRepository extends JpaRepository<TrialCampaign, String> {

    Optional<TrialCampaign> findByCode(String code);

    List<TrialCampaign> findByStatus(TrialCampaign.CampaignStatus status);
}
