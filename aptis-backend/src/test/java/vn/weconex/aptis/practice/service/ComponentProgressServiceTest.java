package vn.weconex.aptis.practice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.practice.domain.AttemptComponentProgress;
import vn.weconex.aptis.practice.repository.AttemptComponentProgressRepository;

@ExtendWith(MockitoExtension.class)
class ComponentProgressServiceTest {

    @Mock
    private AttemptComponentProgressRepository progressRepository;

    @Mock
    private ComponentRepository componentRepository;

    @Test
    void repeatedSubmitOfClosedLastComponentIsIdempotent() {
        AttemptComponentProgress component = new AttemptComponentProgress();
        component.setAttemptId("attempt-1");
        component.setComponentId("listening");
        component.setStartedAt(Instant.now().minusSeconds(60));
        component.setSubmittedAt(Instant.now());
        when(progressRepository.findByAttemptIdOrderByDisplayOrder("attempt-1"))
                .thenReturn(List.of(component));

        ComponentProgressService service =
                new ComponentProgressService(progressRepository, componentRepository);

        assertThat(service.submitComponent("attempt-1", "listening")).isTrue();
        verify(progressRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void repeatedBeginDoesNotExtendDeadline() {
        Instant startedAt = Instant.now().minusSeconds(30);
        Instant expiresAt = Instant.now().plusSeconds(690);
        AttemptComponentProgress component = progress(
                "speaking", 1, startedAt, expiresAt, null);
        when(progressRepository.findByAttemptIdOrderByDisplayOrder("attempt-1"))
                .thenReturn(List.of(component));

        ComponentProgressService service =
                new ComponentProgressService(progressRepository, componentRepository);

        AttemptComponentProgress result = service.beginComponent("attempt-1", "speaking");

        assertThat(result.getStartedAt()).isEqualTo(startedAt);
        assertThat(result.getExpiresAt()).isEqualTo(expiresAt);
        verify(progressRepository, never()).save(any());
    }

    @Test
    void cannotBeginNextComponentBeforePreviousOneIsSubmitted() {
        AttemptComponentProgress first = progress("listening", 1, null, null, null);
        AttemptComponentProgress second = progress("reading", 2, null, null, null);
        when(progressRepository.findByAttemptIdOrderByDisplayOrder("attempt-1"))
                .thenReturn(List.of(first, second));

        ComponentProgressService service =
                new ComponentProgressService(progressRepository, componentRepository);

        assertThatThrownBy(() -> service.beginComponent("attempt-1", "reading"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Chưa hoàn thành kỹ năng trước đó");
        verify(progressRepository, never()).save(any());
    }

    @Test
    void submitDoesNotStartClockOfNextComponent() {
        AttemptComponentProgress first = progress(
                "listening", 1, Instant.now().minusSeconds(30),
                Instant.now().plusSeconds(30), null);
        AttemptComponentProgress second = progress("reading", 2, null, null, null);
        when(progressRepository.findByAttemptIdOrderByDisplayOrder("attempt-1"))
                .thenReturn(List.of(first, second));

        ComponentProgressService service =
                new ComponentProgressService(progressRepository, componentRepository);

        assertThat(service.submitComponent("attempt-1", "listening")).isFalse();
        assertThat(first.getSubmittedAt()).isNotNull();
        assertThat(second.getStartedAt()).isNull();
        assertThat(second.getExpiresAt()).isNull();
        verify(progressRepository).saveAll(List.of(first, second));
    }

    private static AttemptComponentProgress progress(
            String componentId,
            int order,
            Instant startedAt,
            Instant expiresAt,
            Instant submittedAt) {
        AttemptComponentProgress progress = new AttemptComponentProgress();
        progress.setAttemptId("attempt-1");
        progress.setComponentId(componentId);
        progress.setDisplayOrder(order);
        progress.setDurationSeconds(600);
        progress.setStartedAt(startedAt);
        progress.setExpiresAt(expiresAt);
        progress.setSubmittedAt(submittedAt);
        return progress;
    }
}
