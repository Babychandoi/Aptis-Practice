package vn.weconex.aptis.catalog.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.catalog.domain.ExamStructure.Component;

public interface ComponentRepository extends JpaRepository<Component, String> {

    List<Component> findByExamVersionIdAndActiveTrueOrderByDisplayOrder(String examVersionId);

    Optional<Component> findByExamVersionIdAndCode(String examVersionId, String code);
}
