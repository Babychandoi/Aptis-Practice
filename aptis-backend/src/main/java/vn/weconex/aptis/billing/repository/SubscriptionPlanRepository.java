package vn.weconex.aptis.billing.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.BillingEntities.SubscriptionPlan;

public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, String> {

    List<SubscriptionPlan> findByStatusOrderByDisplayOrder(SubscriptionPlan.PlanStatus status);

    Optional<SubscriptionPlan> findByCode(String code);
}
