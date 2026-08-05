package vn.weconex.aptis.content.mongo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface QuestionSetDocumentRepository extends MongoRepository<QuestionSetDocument, String> {

    Optional<QuestionSetDocument> findByQuestionSetIdAndRevision(String questionSetId, int revision);

    List<QuestionSetDocument> findByQuestionSetIdIn(List<String> questionSetIds);
}
