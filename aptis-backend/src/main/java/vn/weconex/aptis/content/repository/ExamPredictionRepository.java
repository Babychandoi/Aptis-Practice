package vn.weconex.aptis.content.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.content.domain.ExamPrediction;

public interface ExamPredictionRepository extends JpaRepository<ExamPrediction, String> {

    /** Dự đoán của một ngày, đã công bố. */
    @Query("""
            SELECT p FROM ExamPrediction p
            WHERE p.status = vn.weconex.aptis.content.domain.ExamPrediction$PredictionStatus.PUBLISHED
              AND p.predictDate = :date
            ORDER BY p.displayOrder, p.priority, p.id
            """)
    List<ExamPrediction> findPublishedByDate(@Param("date") LocalDate date);

    /**
     * Ngày có dự đoán gần nhất không vượt quá {@code date}.
     *
     * <p>Cần đến vì admin không nhập mỗi ngày: hôm nay chưa có tin thì hiển thị
     * tin mới nhất thay vì trang trống.
     */
    @Query("""
            SELECT MAX(p.predictDate) FROM ExamPrediction p
            WHERE p.status = vn.weconex.aptis.content.domain.ExamPrediction$PredictionStatus.PUBLISHED
              AND p.predictDate <= :date
            """)
    Optional<LocalDate> findLatestDateUpTo(@Param("date") LocalDate date);

    /**
     * Dự đoán trong khoảng ngày, dùng cho tab "đề hot nhất N tháng qua" — client
     * đếm số lần lặp của từng chủ đề.
     */
    @Query("""
            SELECT p FROM ExamPrediction p
            WHERE p.status = vn.weconex.aptis.content.domain.ExamPrediction$PredictionStatus.PUBLISHED
              AND p.predictDate BETWEEN :from AND :to
            ORDER BY p.predictDate DESC, p.displayOrder
            """)
    List<ExamPrediction> findPublishedBetween(
            @Param("from") LocalDate from, @Param("to") LocalDate to);

    /** Cho trang admin: xem cả DRAFT. */
    List<ExamPrediction> findByPredictDateOrderByDisplayOrderAscIdAsc(LocalDate predictDate);

    List<ExamPrediction> findAllByOrderByPredictDateDescDisplayOrderAsc();
}
