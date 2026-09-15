package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction;

/** Dự đoán đề riêng của giáo viên. */
public interface ClassroomPredictionRepository extends JpaRepository<ClassroomPrediction, String> {

    List<ClassroomPrediction> findByClassroomIdOrderByCreatedAtDesc(String classroomId);
}
