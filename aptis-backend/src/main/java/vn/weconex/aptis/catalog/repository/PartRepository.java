package vn.weconex.aptis.catalog.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;

public interface PartRepository extends JpaRepository<Part, String> {

    List<Part> findByComponentIdAndActiveTrueOrderByDisplayOrder(String componentId);

    List<Part> findByComponentIdInAndActiveTrueOrderByDisplayOrder(List<String> componentIds);

    Optional<Part> findByComponentIdAndCode(String componentId, String code);
}
