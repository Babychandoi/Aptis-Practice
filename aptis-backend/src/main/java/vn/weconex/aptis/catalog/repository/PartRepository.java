package vn.weconex.aptis.catalog.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;

public interface PartRepository extends JpaRepository<Part, String> {

    /**
     * JOIN FETCH component vì PartResponse trả componentCode — Part.component là
     * LAZY nên đọc ngoài transaction sẽ ném LazyInitializationException.
     */
    @Query("select p from Part p join fetch p.component"
            + " where p.component.id = :componentId and p.active = true"
            + " order by p.displayOrder")
    List<Part> findByComponentIdAndActiveTrueOrderByDisplayOrder(@Param("componentId") String componentId);

    List<Part> findByComponentIdInAndActiveTrueOrderByDisplayOrder(List<String> componentIds);

    Optional<Part> findByComponentIdAndCode(String componentId, String code);
}
