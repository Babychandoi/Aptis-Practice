package vn.weconex.aptis.practice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.practice.domain.BlueprintPartRule;

public interface BlueprintPartRuleRepository extends JpaRepository<BlueprintPartRule, String> {

    List<BlueprintPartRule> findByBlueprintIdOrderByDisplayOrder(String blueprintId);

    /** Rule của nhiều đề trong một truy vấn, dùng khi dựng danh sách đề thi. */
    List<BlueprintPartRule> findByBlueprintIdInOrderByDisplayOrder(List<String> blueprintIds);

    void deleteByBlueprintId(String blueprintId);
}
