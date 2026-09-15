package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomMaterial;

/** Tài liệu lớp. */
public interface ClassroomMaterialRepository extends JpaRepository<ClassroomMaterial, String> {

    List<ClassroomMaterial> findByClassroomIdOrderByCreatedAtDesc(String classroomId);
}
