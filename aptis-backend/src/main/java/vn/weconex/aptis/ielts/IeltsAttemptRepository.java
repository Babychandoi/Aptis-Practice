package vn.weconex.aptis.ielts;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import vn.weconex.aptis.ielts.IeltsModels.*;
public interface IeltsAttemptRepository extends MongoRepository<Attempt, String> {
    Page<Attempt> findByUserIdOrderByCreatedAtDesc(String userId, Pageable page);
    Page<Attempt> findByExamAuthorIdAndStatus(String authorId, Status status, Pageable page);
    Page<Attempt> findByStatus(Status status, Pageable page);
}
