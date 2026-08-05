package vn.weconex.aptis.evaluation.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface RubricDefinitionRepository extends MongoRepository<RubricDefinition, String> {

    Optional<RubricDefinition> findByCode(String code);

    List<RubricDefinition> findByComponentCodeAndStatus(String componentCode, String status);
}
