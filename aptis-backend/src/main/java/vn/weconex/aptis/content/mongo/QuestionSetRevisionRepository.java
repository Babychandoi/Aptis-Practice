package vn.weconex.aptis.content.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface QuestionSetRevisionRepository extends MongoRepository<QuestionSetRevision, String> {

    List<QuestionSetRevision> findByQuestionSetIdOrderByRevisionDesc(String questionSetId);

    Optional<QuestionSetRevision> findByQuestionSetIdAndRevision(String questionSetId, int revision);
}
