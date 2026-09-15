package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.Assignment;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.Assignment.AssignmentStatus;

/** Bài giao. */
public interface AssignmentRepository extends JpaRepository<Assignment, String> {

    List<Assignment> findByClassroomIdOrderByCreatedAtDesc(String classroomId);

    /** Học viên chỉ thấy bài đã phát hành. */
    List<Assignment> findByClassroomIdAndStatusOrderByCreatedAtDesc(
            String classroomId, AssignmentStatus status);

    long countByClassroomIdAndStatus(String classroomId, AssignmentStatus status);
}
