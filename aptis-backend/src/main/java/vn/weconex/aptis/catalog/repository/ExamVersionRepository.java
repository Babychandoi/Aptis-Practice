package vn.weconex.aptis.catalog.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.catalog.domain.ExamStructure.ExamVersion;
import vn.weconex.aptis.common.util.Enums.PublishStatus;

public interface ExamVersionRepository extends JpaRepository<ExamVersion, String> {

    List<ExamVersion> findByStatus(PublishStatus status);

    List<ExamVersion> findByExamProductIdAndStatus(String examProductId, PublishStatus status);

    Optional<ExamVersion> findByCode(String code);
}
