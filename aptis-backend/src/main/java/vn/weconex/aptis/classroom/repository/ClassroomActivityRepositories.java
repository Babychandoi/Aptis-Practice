package vn.weconex.aptis.classroom.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.ClassroomSession;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostComment;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostRead;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.PostUserKey;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.SessionAttendance;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.SessionUserKey;

/** Repository cho lịch học, điểm danh và tương tác bảng tin lớp. */
public final class ClassroomActivityRepositories {

    private ClassroomActivityRepositories() {
    }

    public interface ClassroomSessionRepository extends JpaRepository<ClassroomSession, String> {
        List<ClassroomSession> findByClassroomIdOrderByStartsAtAsc(String classroomId);

        /** Buổi sắp tới gần nhất chưa huỷ, để đếm ngược. */
        @Query("""
                SELECT s FROM ClassroomSession s
                WHERE s.classroomId = :classroomId AND s.status = 'SCHEDULED' AND s.endsAt > :now
                ORDER BY s.startsAt ASC
                """)
        List<ClassroomSession> upcoming(@Param("classroomId") String classroomId, @Param("now") Instant now);
    }

    public interface SessionAttendanceRepository extends JpaRepository<SessionAttendance, SessionUserKey> {
        List<SessionAttendance> findBySessionIdIn(List<String> sessionIds);
    }

    public interface PostReadRepository extends JpaRepository<PostRead, PostUserKey> {
        List<PostRead> findByPostIdIn(List<String> postIds);
    }

    public interface PostCommentRepository extends JpaRepository<PostComment, String> {
        List<PostComment> findByPostIdInOrderByCreatedAtAsc(List<String> postIds);
    }
}
