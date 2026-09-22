package vn.weconex.aptis.conversation.service;

import java.time.Instant;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.conversation.domain.AiConversationSession;
import vn.weconex.aptis.conversation.repository.AiConversationSessionRepository;
import vn.weconex.aptis.entitlement.service.EntitlementService;

@Service
@RequiredArgsConstructor
public class AiConversationService {
    private static final ZoneId QUOTA_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Set<String> LEVELS = Set.of("A2", "B1", "B2", "C1");
    private static final Set<String> VOICES = Set.of("Aoede", "Puck");
    private final AiConversationSessionRepository repository;
    private final EntitlementService entitlementService;
    private final GeminiEphemeralTokenClient tokenClient;
    private final GeminiProviderPool providerPool;
    private final AptisProperties properties;
    private final AiConversationPrompt conversationPrompt;
    private final AiConversationMemoryService memoryService;

    @Transactional
    public CreatedSession create(String userId, String topic, String level, String previousSessionId,
            String resumptionHandle, String voice) {
        requireAccess(userId);
        String safeLevel = LEVELS.contains(level) ? level : "B1";
        String safeVoice = VOICES.contains(voice) ? voice : "Aoede";
        String safeTopic = topic == null || topic.isBlank() ? "Daily life" : topic.strip();
        if (safeTopic.length() > 100) safeTopic = safeTopic.substring(0, 100);
        Instant now = Instant.now();
        if (repository.countByUserIdAndCreatedAtAfter(userId, now.minusSeconds(60)) >= 6) {
            throw new ApiException(ErrorCode.RATE_LIMITED, "Bạn đang tạo lại phiên quá nhanh, hãy chờ một phút");
        }
        List<AiConversationSession> live = repository.findLive(userId, now);
        AiConversationSession previous = null;
        if (previousSessionId != null) {
            previous = repository.findById(previousSessionId)
                    .filter(s -> s.getUserId().equals(userId))
                    .orElseThrow(() -> ApiException.notFound("AiConversationSession", previousSessionId));
            for (AiConversationSession item : live) {
                item.setStatus("HANDOFF");
                if (item.getEndedAt() == null) item.setEndedAt(now);
            }
        } else if (!live.isEmpty()) {
            // Người dùng bấm bắt đầu là yêu cầu thay thế phiên cũ. Trình duyệt có thể
            // bị đóng hoặc mất mạng trước khi gửi /close, không được khóa họ tới hết TTL.
            for (AiConversationSession item : live) {
                item.setStatus("CLOSED");
                if (item.getEndedAt() == null) item.setEndedAt(now);
            }
        }
        // Ngữ cảnh dựng từ bộ nhớ bền, không chỉ từ phiên liền trước: học viên có
        // thể đã nhảy qua vài phiên vì mất mạng, và hôm sau quay lại vẫn cần AI
        // nhớ tên cùng chuyện đã kể.
        String memory = memoryService.buildContext(
                userId, previous == null ? null : previous.getSummary());
        var config = properties.aiConversation();
        DailyQuota quota = dailyQuota(userId, now);
        if (quota.remainingSeconds() <= 0) {
            throw new ApiException(ErrorCode.RATE_LIMITED,
                    "Bạn đã dùng hết " + (quota.limitSeconds() / 60)
                            + " phút AI Voice hôm nay. Hạn mức sẽ được đặt lại lúc 00:00.");
        }
        long configuredSessionSeconds = Math.max(1, config.sessionMinutes()) * 60L;
        long sessionSeconds = Math.min(configuredSessionSeconds, quota.remainingSeconds());
        int tokenMinutes = (int) Math.max(1, (sessionSeconds + 59) / 60);
        int handoffSeconds = quota.remainingSeconds() > sessionSeconds
                ? config.handoffSecondsBeforeExpiry() : 0;
        var credential = providerPool.acquire();
        GeminiEphemeralTokenClient.Token token;
        try {
            token = tokenClient.create(conversationPrompt.build(safeTopic, safeLevel, memory), credential,
                    tokenMinutes, resumptionHandle, safeVoice);
            providerPool.success(credential.providerId());
        } catch (RuntimeException ex) {
            providerPool.failure(credential.providerId(), ex.getMessage());
            throw ex;
        }
        AiConversationSession session = new AiConversationSession();
        session.setUserId(userId);
        session.setStatus("ACTIVE");
        session.setTopic(safeTopic);
        session.setCefrLevel(safeLevel);
        session.setModel(credential.model());
        session.setProviderId(credential.providerId());
        session.setStartedAt(now);
        session.setExpiresAt(now.plusSeconds(sessionSeconds));
        session.setPreviousSessionId(previousSessionId);
        session = repository.save(session);
        return new CreatedSession(session, token.value(), token.newSessionExpiresAt(), handoffSeconds);
    }

    @Transactional
    public void saveSummary(String userId, String id, String summary, long inputTokens, long outputTokens,
            Long connectLatencyMs, int reconnectCount, int disconnectCount, int rateLimitCount) {
        AiConversationSession session = requireOwned(userId, id);
        if (summary != null && summary.length() > 20_000) summary = summary.substring(0, 20_000);
        session.setSummary(summary);
        session.setInputTokens(Math.max(0, inputTokens));
        session.setOutputTokens(Math.max(0, outputTokens));
        if (connectLatencyMs != null) session.setConnectLatencyMs(Math.max(0, connectLatencyMs));
        session.setReconnectCount(Math.max(0, reconnectCount));
        session.setDisconnectCount(Math.max(0, disconnectCount));
        session.setRateLimitCount(Math.max(0, rateLimitCount));
    }

    /** Ghi lượt nói mới. Chỉ chủ phiên mới ghi được. */
    @Transactional
    public void appendTurns(String userId, String sessionId,
            List<vn.weconex.aptis.conversation.web.AiConversationController.TurnItem> turns) {
        requireOwned(userId, sessionId);
        if (turns == null || turns.isEmpty()) return;
        memoryService.appendTurns(userId, sessionId, turns.stream()
                .map(t -> new AiConversationMemoryService.TurnInput(t.role(), t.content(), t.seq()))
                .toList());
    }

    @Transactional
    public void close(String userId, String id, String error) {
        AiConversationSession session = requireOwned(userId, id);
        session.setStatus(error == null || error.isBlank() ? "CLOSED" : "ERROR");
        if (session.getEndedAt() == null) session.setEndedAt(Instant.now());
        if (error != null) session.setErrorMessage(error.substring(0, Math.min(500, error.length())));
        // HANDOFF không đi qua đây; chỉ tóm tắt khi học viên thật sự dừng nói,
        // tránh gọi LLM mỗi lần rớt mạng rồi nối lại.
        memoryService.summariseSession(userId, id);
    }

    public void requireAccess(String userId) {
        if (!entitlementService.hasAiConversationAccess(userId)) throw ApiException.premiumRequired();
    }

    public boolean hasAccess(String userId) {
        return entitlementService.hasAiConversationAccess(userId);
    }

    @Transactional(readOnly = true)
    public DailyQuota dailyQuota(String userId) {
        return dailyQuota(userId, Instant.now());
    }

    private DailyQuota dailyQuota(String userId, Instant now) {
        LocalDate date = now.atZone(QUOTA_ZONE).toLocalDate();
        Instant dayStart = date.atStartOfDay(QUOTA_ZONE).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(QUOTA_ZONE).toInstant();
        long limit = Math.max(1, properties.aiConversation().dailyMinutes()) * 60L;
        long used = 0;
        for (AiConversationSession session : repository.findOverlappingDay(userId, dayStart, dayEnd)) {
            Instant start = session.getStartedAt().isBefore(dayStart) ? dayStart : session.getStartedAt();
            Instant naturalEnd = session.getEndedAt() != null ? session.getEndedAt()
                    : (session.getExpiresAt().isBefore(now) ? session.getExpiresAt() : now);
            Instant end = naturalEnd.isAfter(dayEnd) ? dayEnd : naturalEnd;
            if (end.isAfter(start)) used += Duration.between(start, end).getSeconds();
        }
        return new DailyQuota(limit, Math.min(limit, used), Math.max(0, limit - used));
    }

    private AiConversationSession requireOwned(String userId, String id) {
        return repository.findById(id).filter(s -> s.getUserId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("AiConversationSession", id));
    }

    public record CreatedSession(AiConversationSession session, String ephemeralToken,
            Instant tokenStartExpiresAt, int handoffSecondsBeforeExpiry) {}
    public record DailyQuota(long limitSeconds, long usedSeconds, long remainingSeconds) {}
}
