package vn.weconex.aptis.evaluation.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import vn.weconex.aptis.evaluation.mongo.EvaluationDocument;

public interface EvaluationDocumentRepository extends MongoRepository<EvaluationDocument, String> {

    Optional<EvaluationDocument> findByEvaluationJobId(String evaluationJobId);

    List<EvaluationDocument> findByAttemptId(String attemptId);
}
