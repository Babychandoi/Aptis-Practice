package vn.weconex.aptis.platform.syncjob;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import vn.weconex.aptis.platform.notification.NotificationSender;

class SyncHealthServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 17);

    private SyncHealthService service(LocalDate prediction, LocalDate warmUp, LocalDateTime weeklyOk, List<String> failed) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(contains("exam_predictions"), eq(LocalDate.class), any(Object[].class))).thenReturn(prediction);
        when(jdbc.queryForObject(contains("daily_warm_ups"), eq(LocalDate.class), any(Object[].class))).thenReturn(warmUp);
        when(jdbc.queryForObject(contains("sync_job_runs"), eq(Timestamp.class)))
                .thenReturn(weeklyOk == null ? null : Timestamp.valueOf(weeklyOk));
        when(jdbc.queryForList(anyString(), eq(String.class), any(Object[].class))).thenReturn(failed);
        return new SyncHealthService(jdbc, mock(NotificationSender.class), "");
    }

    @Test
    void healthyWhenTodayDataExistsAndWeeklyRecent() {
        var health = service(TODAY, TODAY, TODAY.minusDays(2).atTime(3, 5), List.of()).check(TODAY.atTime(8, 0));
        assertThat(health.ok()).isTrue();
    }

    @Test
    void missingTodayPredictionIsOnlyAProblemAfterMorningJob() {
        var early = service(TODAY.minusDays(1), TODAY.minusDays(1), null, List.of()).check(TODAY.atTime(6, 30));
        assertThat(early.ok()).isTrue();

        var late = service(TODAY.minusDays(1), TODAY, null, List.of()).check(TODAY.atTime(8, 0));
        assertThat(late.ok()).isFalse();
        assertThat(late.checks()).filteredOn(c -> !c.ok()).extracting(SyncHealthService.Check::key).containsExactly("prediction");
    }

    @Test
    void staleWeeklyImportAndFailedStepsAreReported() {
        var health = service(TODAY, TODAY, TODAY.minusDays(10).atTime(3, 5), List.of("aptisprep-weekly"))
                .check(TODAY.atTime(22, 0));
        assertThat(health.ok()).isFalse();
        assertThat(health.checks()).filteredOn(c -> !c.ok()).extracting(SyncHealthService.Check::key)
                .containsExactly("weekly", "failed-steps");
    }
}
