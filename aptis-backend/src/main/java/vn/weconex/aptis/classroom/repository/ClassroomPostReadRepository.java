package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostRead;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostUserKey;

public interface ClassroomPostReadRepository extends JpaRepository<PostRead, PostUserKey> {
    List<PostRead> findByPostIdIn(List<String> postIds);
}
