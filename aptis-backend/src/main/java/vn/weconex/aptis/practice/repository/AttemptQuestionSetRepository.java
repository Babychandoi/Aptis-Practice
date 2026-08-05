package vn.weconex.aptis.practice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.practice.domain.AttemptQuestionSet;

public interface AttemptQuestionSetRepository extends JpaRepository<AttemptQuestionSet, String> {

    List<AttemptQuestionSet> findByAttemptIdOrderByDisplayOrder(String attemptId);

    Optional<AttemptQuestionSet> findByAttemptIdAndQuestionSetId(String attemptId, String questionSetId);
}
