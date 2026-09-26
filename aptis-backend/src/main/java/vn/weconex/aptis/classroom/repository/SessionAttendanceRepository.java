package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.SessionAttendance;
import vn.weconex.aptis.classroom.domain.ClassroomActivityEntities.SessionUserKey;

public interface SessionAttendanceRepository extends JpaRepository<SessionAttendance, SessionUserKey> {
    List<SessionAttendance> findBySessionIdIn(List<String> sessionIds);
}
