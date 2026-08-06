package vn.weconex.aptis.practice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.common.util.Enums.PublishStatus;
import vn.weconex.aptis.practice.domain.TestBlueprint;

public interface TestBlueprintRepository extends JpaRepository<TestBlueprint, String> {

    Optional<TestBlueprint> findByCode(String code);

    boolean existsByComponentIdAndCode(String componentId, String code);

    List<TestBlueprint> findByComponentIdOrderByCreatedAtDesc(String componentId);

    List<TestBlueprint> findByStatusAndModeOrderByAccessLevelAscNameAsc(
            PublishStatus status, PracticeMode mode);

    List<TestBlueprint> findByExamVersionIdAndStatus(String examVersionId, PublishStatus status);
}
