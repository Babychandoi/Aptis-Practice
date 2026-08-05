package vn.weconex.aptis.practice.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.practice.domain.AttemptComponentScore;

public interface AttemptComponentScoreRepository
        extends JpaRepository<AttemptComponentScore, String> {

    List<AttemptComponentScore> findByAttemptId(String attemptId);
}
