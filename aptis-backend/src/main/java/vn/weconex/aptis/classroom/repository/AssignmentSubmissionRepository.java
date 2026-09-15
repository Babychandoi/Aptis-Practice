package vn.weconex.aptis.classroom.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.AssignmentSubmission;

/** Bài nộp. */
public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, String> {

    Optional<AssignmentSubmission> findByAssignmentIdAndUserId(String assignmentId, String userId);

    List<AssignmentSubmission> findByAssignmentIdOrderByCreatedAtDesc(String assignmentId);

    List<AssignmentSubmission> findByUserIdAndAssignmentIdIn(String userId, List<String> assignmentIds);

    Optional<AssignmentSubmission> findByAttemptId(String attemptId);

    /**
     * Số bài đã nộp của từng bài giao, gom một lần cho cả danh sách.
     *
     * <p>Trả Object[]{assignmentId, số bài đã nộp}. Lặp từng bài sẽ thành N+1.
     */
    @Query("""
            SELECT s.assignmentId, COUNT(s) FROM AssignmentSubmission s
            WHERE s.assignmentId IN :assignmentIds
              AND s.status <> vn.weconex.aptis.classroom.domain.ClassroomContentEntities$AssignmentSubmission$SubmissionStatus.NOT_STARTED
            GROUP BY s.assignmentId
            """)
    List<Object[]> countSubmittedByAssignments(@Param("assignmentIds") List<String> assignmentIds);

    /** Bài chờ chấm — badge trên sidebar giáo viên. */
    @Query("""
            SELECT COUNT(s) FROM AssignmentSubmission s
            WHERE s.assignmentId IN :assignmentIds
              AND s.status IN (
                vn.weconex.aptis.classroom.domain.ClassroomContentEntities$AssignmentSubmission$SubmissionStatus.SUBMITTED,
                vn.weconex.aptis.classroom.domain.ClassroomContentEntities$AssignmentSubmission$SubmissionStatus.LATE)
            """)
    long countPendingGrading(@Param("assignmentIds") List<String> assignmentIds);
}
