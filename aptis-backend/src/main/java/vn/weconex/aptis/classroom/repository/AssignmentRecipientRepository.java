package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.classroom.domain.AssignmentRecipient;

/** Học viên được chỉ định; không có dòng nào nghĩa là bài giao cho cả lớp. */
public interface AssignmentRecipientRepository
        extends JpaRepository<AssignmentRecipient, AssignmentRecipient.Key> {

    List<AssignmentRecipient> findByAssignmentId(String assignmentId);

    boolean existsByAssignmentIdAndUserId(String assignmentId, String userId);

    long countByAssignmentId(String assignmentId);

    /** Người nhận của nhiều bài giao, gom một lần để khỏi N+1. */
    List<AssignmentRecipient> findByAssignmentIdIn(List<String> assignmentIds);

    /**
     * Id các bài giao mà học viên này được nhận riêng.
     *
     * <p>Dùng để lọc danh sách bài của học viên: bài không có người nhận nào là
     * của cả lớp, bài có người nhận thì chỉ hiện nếu em đó nằm trong danh sách.
     */
    @Query("SELECT r.assignmentId FROM AssignmentRecipient r WHERE r.userId = :userId")
    List<String> findAssignmentIdsByUserId(@Param("userId") String userId);

    /** Id các bài giao có chỉ định người nhận, trong một tập bài. */
    @Query("SELECT DISTINCT r.assignmentId FROM AssignmentRecipient r"
            + " WHERE r.assignmentId IN :assignmentIds")
    List<String> findAssignmentIdsWithRecipients(
            @Param("assignmentIds") List<String> assignmentIds);

    @Modifying
    @Query("DELETE FROM AssignmentRecipient r WHERE r.assignmentId = :assignmentId")
    void deleteByAssignmentId(@Param("assignmentId") String assignmentId);
}
