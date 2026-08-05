package vn.weconex.aptis.practice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.practice.domain.AttemptPartScore;

public interface AttemptPartScoreRepository extends JpaRepository<AttemptPartScore, String> {

    List<AttemptPartScore> findByAttemptId(String attemptId);
}
