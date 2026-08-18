package vn.weconex.aptis.practice.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.weconex.aptis.practice.domain.AttemptComponentProgress;

public interface AttemptComponentProgressRepository
        extends JpaRepository<AttemptComponentProgress, String> {

    List<AttemptComponentProgress> findByAttemptIdOrderByDisplayOrder(String attemptId);

    Optional<AttemptComponentProgress> findByAttemptIdAndComponentId(
            String attemptId, String componentId);
}
