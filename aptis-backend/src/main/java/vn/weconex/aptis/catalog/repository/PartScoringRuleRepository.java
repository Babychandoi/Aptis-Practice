package vn.weconex.aptis.catalog.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.catalog.domain.PartScoringRule;

public interface PartScoringRuleRepository extends JpaRepository<PartScoringRule, String> {

    @EntityGraph(attributePaths = {"part", "part.component"})
    List<PartScoringRule> findAllByOrderByPartComponentDisplayOrderAscPartDisplayOrderAsc();
}
