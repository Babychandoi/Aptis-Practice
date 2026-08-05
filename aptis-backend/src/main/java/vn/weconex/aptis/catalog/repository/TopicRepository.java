package vn.weconex.aptis.catalog.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.catalog.domain.ExamStructure.Topic;

public interface TopicRepository extends JpaRepository<Topic, String> {

    List<Topic> findByActiveTrue();

    Optional<Topic> findByCode(String code);

    Optional<Topic> findFirstByNameIgnoreCase(String name);
}
