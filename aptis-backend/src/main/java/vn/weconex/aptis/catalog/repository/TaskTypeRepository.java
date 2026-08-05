package vn.weconex.aptis.catalog.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.catalog.domain.ExamStructure.TaskType;

public interface TaskTypeRepository extends JpaRepository<TaskType, String> {

    Optional<TaskType> findByCode(String code);

    List<TaskType> findByActiveTrue();
}
