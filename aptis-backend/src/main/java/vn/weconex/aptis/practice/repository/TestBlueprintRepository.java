package vn.weconex.aptis.practice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.common.util.Enums.PracticeMode;
import vn.weconex.aptis.common.util.Enums.PublishStatus;
import vn.weconex.aptis.practice.domain.TestBlueprint;

public interface TestBlueprintRepository extends JpaRepository<TestBlueprint, String> {

    Optional<TestBlueprint> findByCode(String code);

    boolean existsByComponentIdAndCode(String componentId, String code);

    List<TestBlueprint> findByComponentIdOrderByCreatedAtDesc(String componentId);

    /** Bài thi do một giáo viên tự ghép. */
    List<TestBlueprint> findByOwnerTeacherIdOrderByCreatedAtDesc(String ownerTeacherId);

    /**
     * Đề thi thử chung cho học viên.
     *
     * <p>{@code ownerTeacherIdIsNull}: bài giáo viên tự ghép chỉ dành cho lớp
     * họ, lọt vào đây là mọi học viên đều thấy.
     */
    List<TestBlueprint> findByStatusAndModeAndOwnerTeacherIdIsNullOrderByAccessLevelAscNameAsc(
            PublishStatus status, PracticeMode mode);

    /**
     * Danh sách đề thi thử có phân trang, lọc sẵn theo kỹ năng.
     *
     * <p>{@code componentId} null nghĩa là đề thi cả 5 kỹ năng (cột componentId
     * NULL), không phải "mọi kỹ năng" — nên phải so IS NULL chứ không bỏ qua
     * điều kiện.
     *
     * <p>Lọc ở DB thay vì tải hết rồi lọc trong Java: một kỹ năng có hàng chục
     * đề và mỗi đề còn kéo theo truy vấn rule khi dựng response.
     */
    @Query("select b from TestBlueprint b"
            + " where b.status = :status and b.mode = :mode"
            // Bài giáo viên tự ghép chỉ dành cho lớp họ; lọt vào đây là mọi
            // học viên đều thấy trong danh sách thi thử chung.
            + " and b.ownerTeacherId is null"
            + " and ((:componentId is null and b.componentId is null)"
            + "      or b.componentId = :componentId)"
            + " order by b.accessLevel asc, b.name asc")
    Page<TestBlueprint> findAvailable(
            @Param("status") PublishStatus status,
            @Param("mode") PracticeMode mode,
            @Param("componentId") String componentId,
            Pageable pageable);

    List<TestBlueprint> findByExamVersionIdAndStatus(String examVersionId, PublishStatus status);
}
