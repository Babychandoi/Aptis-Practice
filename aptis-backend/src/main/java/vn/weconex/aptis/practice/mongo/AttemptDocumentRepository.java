package vn.weconex.aptis.practice.mongo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface AttemptDocumentRepository extends MongoRepository<AttemptDocument, String> {

    Optional<AttemptDocument> findByAttemptId(String attemptId);
}
