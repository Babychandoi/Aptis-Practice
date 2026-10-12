package vn.weconex.aptis.ielts;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import vn.weconex.aptis.ielts.IeltsModels.*;
public interface IeltsExamRepository extends MongoRepository<Exam, String> {
    Page<Exam> findByPublishedTrueAndTrack(Track track, Pageable page);
    Page<Exam> findByAuthorId(String authorId, Pageable page);
}
