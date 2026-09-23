package vn.weconex.aptis.conversation.web;

import java.time.Instant;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.conversation.service.AiConversationService;
import vn.weconex.aptis.conversation.service.GeminiProviderPool;
import vn.weconex.aptis.conversation.service.AiConversationHistoryService.HistoryTurn;

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
                request.previousSessionId(), request.resumptionHandle(), request.voice(),
                request.history(), request.historyRevision(), Boolean.TRUE.equals(request.freshStart()));
        return response(created);
    }

    @PostMapping("/sessions/{id}/reconnect")
    public SessionResponse reconnect(@PathVariable String id, @Valid @RequestBody ReconnectRequest request) {
        return response(service.reconnect(currentUser.requireUserId(), id, request.resumptionHandle(),
                request.history(), request.historyRevision(), Boolean.TRUE.equals(request.forceNew())));
    }

    @PutMapping("/sessions/{id}/history")
    public HistoryResponse history(@PathVariable String id, @Valid @RequestBody HistoryRequest request) {
        return new HistoryResponse(service.saveHistory(currentUser.requireUserId(), id,
                request.turns(), request.revision()));
    }

    private SessionResponse response(AiConversationService.CreatedSession created) {
        var s = created.session();
        return new SessionResponse(s.getId(), created.ephemeralToken(), s.getModel(), s.getStartedAt(),
                s.getExpiresAt(), created.tokenStartExpiresAt(), created.handoffSecondsBeforeExpiry(),
                created.resumeAttempted(), created.history(), s.getHistoryRevision());
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
            @Size(max=8192) String resumptionHandle, @Size(max=30) String voice,
            @Valid List<HistoryTurn> history, @Min(0) Long historyRevision, Boolean freshStart) {}
    public record ReconnectRequest(@Size(max=8192) String resumptionHandle, Boolean forceNew,
            @Valid List<HistoryTurn> history, @Min(0) Long historyRevision) {}
    public record HistoryRequest(@NotNull @Valid List<HistoryTurn> turns, @NotNull @Min(0) Long revision) {}
    public record HistoryResponse(long historyRevision) {}
    public record SessionResponse(String sessionId, String ephemeralToken, String model, Instant startedAt,
            Instant expiresAt, Instant tokenStartExpiresAt, int handoffSecondsBeforeExpiry,
            boolean resumeAttempted, List<HistoryTurn> history, long historyRevision) {}
    private static int value(Integer value) { return value == null ? 0 : value; }
    public record SummaryRequest(@Size(max=20000) String summary, @Min(0) Long inputTokens, @Min(0) Long outputTokens,
            @Min(0) Long connectLatencyMs, @Min(0) Integer reconnectCount,
            @Min(0) Integer disconnectCount, @Min(0) Integer rateLimitCount) {}
    public record CloseRequest(@Size(max=500) String error) {}
    public record TurnsRequest(@NotNull @Size(max=200) @Valid java.util.List<TurnItem> turns) {}
    public record TurnItem(@NotBlank @Pattern(regexp="user|ai") String role,
            @NotBlank @Size(max=8000) String content, @Min(0) int seq, @Min(0) Long revision) {}
}
