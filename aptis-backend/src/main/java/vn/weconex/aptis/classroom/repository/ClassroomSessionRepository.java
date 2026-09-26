package vn.weconex.aptis.classroom.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.ClassroomSession;

/** Buổi học của lớp. */
public interface ClassroomSessionRepository extends JpaRepository<ClassroomSession, String> {

    List<ClassroomSession> findByClassroomIdOrderByStartsAtAsc(String classroomId);

    /** Buổi sắp tới chưa huỷ, gần nhất trước. */
    @Query("""
            SELECT s FROM ClassroomSession s
            WHERE s.classroomId = :classroomId AND s.status = 'SCHEDULED' AND s.endsAt > :now
            ORDER BY s.startsAt ASC
            """)
    List<ClassroomSession> upcoming(@Param("classroomId") String classroomId, @Param("now") Instant now);
}
