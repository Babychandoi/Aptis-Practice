package vn.weconex.aptis.practice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.practice.domain.BlueprintPartRule;

public interface BlueprintPartRuleRepository extends JpaRepository<BlueprintPartRule, String> {

    List<BlueprintPartRule> findByBlueprintIdOrderByDisplayOrder(String blueprintId);

    void deleteByBlueprintId(String blueprintId);
}
