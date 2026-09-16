package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction.PredictionStatus;

/** Dự đoán đề riêng của giáo viên cho lớp. */
public interface ClassroomPredictionRepository extends JpaRepository<ClassroomPrediction, String> {

    /** Giáo viên thấy hết, kể cả mục còn nháp. */
    List<ClassroomPrediction> findByClassroomIdOrderByPredictDateDescDisplayOrderAsc(
            String classroomId);

    /** Học viên chỉ thấy mục đã đăng. */
    List<ClassroomPrediction> findByClassroomIdAndStatusOrderByPredictDateDescDisplayOrderAsc(
            String classroomId, PredictionStatus status);
}
