package vn.weconex.aptis.classroom.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.weconex.aptis.classroom.domain.AssignmentQuestionSet;

/** Đề được gán vào một bài giao. */
public interface AssignmentQuestionSetRepository
        extends JpaRepository<AssignmentQuestionSet, AssignmentQuestionSet.Key> {

    List<AssignmentQuestionSet> findByAssignmentIdOrderByDisplayOrder(String assignmentId);

    @Modifying
    @Query("DELETE FROM AssignmentQuestionSet a WHERE a.assignmentId = :assignmentId")
    void deleteByAssignmentId(@Param("assignmentId") String assignmentId);
}
