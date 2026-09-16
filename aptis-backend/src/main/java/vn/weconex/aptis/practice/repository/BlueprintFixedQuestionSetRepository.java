package vn.weconex.aptis.practice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.practice.domain.BlueprintFixedQuestionSet;

public interface BlueprintFixedQuestionSetRepository
        extends JpaRepository<BlueprintFixedQuestionSet, BlueprintFixedQuestionSet.Key> {

    List<BlueprintFixedQuestionSet> findByKeyBlueprintRuleIdOrderByDisplayOrder(
            String blueprintRuleId);

    /** Nạp một lượt cho nhiều luật — gọi lẻ từng luật sẽ thành N+1. */
    List<BlueprintFixedQuestionSet> findByKeyBlueprintRuleIdInOrderByDisplayOrder(
            List<String> blueprintRuleIds);

    void deleteByKeyBlueprintRuleId(String blueprintRuleId);
}
