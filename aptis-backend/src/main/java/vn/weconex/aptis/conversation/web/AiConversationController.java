package vn.weconex.aptis.conversation.web;

import java.time.Instant;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.conversation.service.AiConversationService;
import vn.weconex.aptis.conversation.service.GeminiProviderPool;

@RestController
@RequestMapping("/api/v1/ai-conversation")
@RequiredArgsConstructor
public class AiConversationController {
    private final CurrentUser currentUser;
    private final AiConversationService service;
    private final GeminiProviderPool providerPool;

    @GetMapping("/access")
    public AccessResponse access() {
        String userId = currentUser.requireUserId();
        boolean allowed = service.hasAccess(userId);
        var quota = service.dailyQuota(userId);
        return new AccessResponse(allowed, allowed && providerPool.configured(),
                quota.limitSeconds(), quota.remainingSeconds());
    }

    @PostMapping("/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse create(@Valid @RequestBody CreateSessionRequest request) {
        var created = service.create(currentUser.requireUserId(), request.topic(), request.level(),
                request.previousSessionId(), request.resumptionHandle(), request.voice());
        var s = created.session();
        return new SessionResponse(s.getId(), created.ephemeralToken(), s.getModel(), s.getStartedAt(),
                s.getExpiresAt(), created.tokenStartExpiresAt(), created.handoffSecondsBeforeExpiry());
    }

    @PutMapping("/sessions/{id}/summary")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void summary(@PathVariable String id, @Valid @RequestBody SummaryRequest request) {
        service.saveSummary(currentUser.requireUserId(), id, request.summary(),
                request.inputTokens() == null ? 0 : request.inputTokens(),
                request.outputTokens() == null ? 0 : request.outputTokens(), request.connectLatencyMs(),
                value(request.reconnectCount()), value(request.disconnectCount()), value(request.rateLimitCount()));
    }

    @PostMapping("/sessions/{id}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void close(@PathVariable String id, @RequestBody(required = false) CloseRequest request) {
        service.close(currentUser.requireUserId(), id, request == null ? null : request.error());
    }

    /**
     * Ghi các lượt vừa nói.
     *
     * <p>Client gọi liên tục trong lúc hội thoại chứ không đợi đóng phiên: đóng
     * tab hay mất mạng thì phần đã nói vẫn còn, phiên sau mới nhớ được.
     */
    @PostMapping("/sessions/{id}/turns")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void turns(@PathVariable String id, @Valid @RequestBody TurnsRequest request) {
        service.appendTurns(currentUser.requireUserId(), id, request.turns());
    }

    public record AccessResponse(boolean allowed, boolean configured, long dailyLimitSeconds,
            long dailyRemainingSeconds) {}
    public record CreateSessionRequest(@Size(max=100) String topic, String level, String previousSessionId,
            @Size(max=8192) String resumptionHandle, @Size(max=30) String voice) {}
    public record SessionResponse(String sessionId, String ephemeralToken, String model, Instant startedAt,
            Instant expiresAt, Instant tokenStartExpiresAt, int handoffSecondsBeforeExpiry) {}
    private static int value(Integer value) { return value == null ? 0 : value; }
    public record SummaryRequest(@Size(max=20000) String summary, @Min(0) Long inputTokens, @Min(0) Long outputTokens,
            @Min(0) Long connectLatencyMs, @Min(0) Integer reconnectCount,
            @Min(0) Integer disconnectCount, @Min(0) Integer rateLimitCount) {}
    public record CloseRequest(@Size(max=500) String error) {}
    public record TurnsRequest(@Size(max=200) java.util.List<TurnItem> turns) {}
    public record TurnItem(@Size(max=10) String role, @Size(max=8000) String content, @Min(0) int seq) {}
}
