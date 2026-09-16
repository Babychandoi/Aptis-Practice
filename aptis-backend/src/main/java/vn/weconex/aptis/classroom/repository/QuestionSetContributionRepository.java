package vn.weconex.aptis.classroom.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.classroom.domain.QuestionSetContribution;
import vn.weconex.aptis.classroom.domain.QuestionSetContribution.ContributionStatus;

/** Đề giáo viên đề xuất vào ngân hàng chung. */
public interface QuestionSetContributionRepository
        extends JpaRepository<QuestionSetContribution, String> {

    Optional<QuestionSetContribution> findByQuestionSetId(String questionSetId);

    /** Nạp một lượt cho cả danh sách đề — gọi lẻ từng đề sẽ thành N+1. */
    List<QuestionSetContribution> findByQuestionSetIdIn(List<String> questionSetIds);

    Page<QuestionSetContribution> findByStatusOrderByCreatedAtAsc(
            ContributionStatus status, Pageable pageable);

    Page<QuestionSetContribution> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
