package vn.weconex.aptis.classroom.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomEntities.Classroom;

/** Lớp học. */
public interface ClassroomRepository extends JpaRepository<Classroom, String> {

    /** Các lớp của một giáo viên, cũ trước — từ V64 một giáo viên dạy được nhiều lớp. */
    List<Classroom> findByTeacherUserIdOrderByCreatedAtAsc(String teacherUserId);

    Optional<Classroom> findByIdAndTeacherUserId(String id, String teacherUserId);

    Optional<Classroom> findByJoinCode(String joinCode);

    boolean existsByJoinCode(String joinCode);

    Page<Classroom> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<Classroom> findByIdIn(List<String> ids);
}
