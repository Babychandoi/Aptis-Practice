package vn.weconex.aptis.billing.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.BillingEntities.PlanFeature;

public interface PlanFeatureRepository extends JpaRepository<PlanFeature, String> {

    List<PlanFeature> findByPlanIdOrderByDisplayOrder(String planId);

    List<PlanFeature> findByPlanIdInOrderByDisplayOrder(List<String> planIds);
}
