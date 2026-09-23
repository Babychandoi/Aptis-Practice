package vn.weconex.aptis.conversation.service;

import static org.assertj.core.api.Assertions.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import vn.weconex.aptis.common.exception.ApiException;

class AiConversationReconnectLimiterTest {
    @Test
    void separateUserRetryBudgetSurvivesFailuresAndResetsAtTheWindowBoundary() {
        var limiter = new AiConversationReconnectLimiter();
        Instant now = Instant.parse("2026-09-23T05:00:00Z");
        for (int i = 0; i < 12; i++) limiter.acquire("one", now);
        assertThatThrownBy(() -> limiter.acquire("one", now.plusSeconds(20)))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.details()).containsEntry("retryAfterSeconds", 40L));
        assertThatCode(() -> limiter.acquire("other", now.plusSeconds(20))).doesNotThrowAnyException();
        assertThatCode(() -> limiter.acquire("one", now.plusSeconds(60))).doesNotThrowAnyException();
    }
}
