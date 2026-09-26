package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostComment;

public interface ClassroomPostCommentRepository extends JpaRepository<PostComment, String> {
    List<PostComment> findByPostIdInOrderByCreatedAtAsc(List<String> postIds);
}
