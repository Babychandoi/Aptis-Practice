package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.ClassroomPredictionQuestionSet;
import vn.weconex.aptis.classroom.domain.ClassroomPredictionQuestionSet.Key;

/** Đề gắn đích danh vào mục dự đoán của lớp. */
public interface ClassroomPredictionQuestionSetRepository
        extends JpaRepository<ClassroomPredictionQuestionSet, Key> {

    List<ClassroomPredictionQuestionSet> findByPredictionIdOrderByDisplayOrderAsc(
            String predictionId);

    /** Nạp một lượt cho cả danh sách — gọi lẻ từng mục sẽ thành N+1. */
    List<ClassroomPredictionQuestionSet> findByPredictionIdInOrderByDisplayOrderAsc(
            List<String> predictionIds);

    void deleteByPredictionId(String predictionId);
}
