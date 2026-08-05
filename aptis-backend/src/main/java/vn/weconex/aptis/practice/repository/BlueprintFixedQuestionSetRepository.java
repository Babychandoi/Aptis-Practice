package vn.weconex.aptis.practice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.practice.domain.BlueprintFixedQuestionSet;

public interface BlueprintFixedQuestionSetRepository
        extends JpaRepository<BlueprintFixedQuestionSet, BlueprintFixedQuestionSet.Key> {

    List<BlueprintFixedQuestionSet> findByKeyBlueprintRuleIdOrderByDisplayOrder(
            String blueprintRuleId);
}
