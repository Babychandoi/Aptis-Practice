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
import vn.weconex.aptis.conversation.service.AiConversationHistoryService.HistoryTurn;

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
    private final AiConversationHistoryService historyService;
    private final AiConversationReconnectLimiter reconnectLimiter;

    @Transactional
    public CreatedSession create(String userId, String topic, String level, String previousSessionId,
            String resumptionHandle, String voice) {
        return create(userId, topic, level, previousSessionId, resumptionHandle, voice, null, null);
    }

    @Transactional
    public CreatedSession create(String userId, String topic, String level, String previousSessionId,
            String resumptionHandle, String voice, List<HistoryTurn> history, Long historyRevision) {
        return create(userId, topic, level, previousSessionId, resumptionHandle, voice, history, historyRevision, false);
    }

    @Transactional
    public CreatedSession create(String userId, String topic, String level, String previousSessionId,
            String resumptionHandle, String voice, List<HistoryTurn> history, Long historyRevision, boolean freshStart) {
        requireAccess(userId);
        String safeLevel = level != null && LEVELS.contains(level) ? level : "B1";
        String safeVoice = voice != null && VOICES.contains(voice) ? voice : "Aoede";
        String safeTopic = topic == null || topic.isBlank() ? "Daily life" : topic.strip();
        if (safeTopic.length() > 100) safeTopic = safeTopic.substring(0, 100);
        Instant now = Instant.now();
        List<AiConversationSession> live = repository.findLive(userId, now);
        AiConversationSession previous = null;
        if (previousSessionId != null) {
            previous = requireOwned(userId, previousSessionId);
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
        if (repository.countByUserIdAndCreatedAtAfter(userId, now.minusSeconds(60)) >= 6) {
            throw new ApiException(ErrorCode.RATE_LIMITED, "Bạn đang tạo lại phiên quá nhanh, hãy chờ một phút");
        }
        // A deliberate new conversation is a context boundary, not deletion of the archive.
        // Automatic lease handoff must keep history even if the original room was started fresh.
        boolean resetContext = freshStart && previousSessionId == null;
        if (previous == null && !resetContext) previous = repository.findFirstByUserIdOrderByStartedAtDesc(userId).orElse(null);
        var config = properties.aiConversation();
        DailyQuota quota = dailyQuota(userId, now);
        if (quota.remainingSeconds() <= 0) {
            throw new ApiException(ErrorCode.RATE_LIMITED,
                    "Bạn đã dùng hết " + (quota.limitSeconds() / 60)
                            + " phút AI Voice hôm nay. Hạn mức sẽ được đặt lại lúc 00:00.");
        }
        long configuredSessionSeconds = Math.max(1, config.sessionMinutes()) * 60L;
        long sessionSeconds = Math.min(configuredSessionSeconds, quota.remainingSeconds());
        int handoffSeconds = quota.remainingSeconds() > sessionSeconds
                ? config.handoffSecondsBeforeExpiry() : 0;
        AiConversationSession session = new AiConversationSession();
        session.setUserId(userId);
        session.setStatus("ACTIVE");
        session.setTopic(safeTopic);
        session.setCefrLevel(safeLevel);
        session.setVoice(safeVoice);
        session.setStartedAt(now);
        session.setExpiresAt(now.plusSeconds(sessionSeconds));
        session.setPreviousSessionId(previous == null ? null : previous.getId());
        historyService.inherit(session, previous);
        session.setMemoryContext(resetContext ? "" : memoryService.buildContext(userId, null));
        boolean resume = hasHandle(resumptionHandle) && previousSessionId != null
                && previous != null && previous.getConnectionPrompt() != null;
        var credential = resume ? providerPool.forSession(previous.getProviderId(), previous.getModel())
                : providerPool.acquire();
        session.setModel(credential.model());
        session.setProviderId(credential.providerId());
        if (resume) session.setVoice(previous.getVoice());
        session = repository.save(session);
        historyService.save(session, history, historyRevision);
        session.setConnectionPrompt(resume ? previous.getConnectionPrompt()
                : conversationPrompt.build(safeTopic, safeLevel, historyService.promptContext(session)));
        var token = issueToken(session, credential, resume ? resumptionHandle : null, now);
        return new CreatedSession(session, token.value(), token.newSessionExpiresAt(), handoffSeconds,
                resume, historyService.read(session));
    }

    @Transactional
    public CreatedSession reconnect(String userId, String id, String resumptionHandle,
            List<HistoryTurn> history, Long historyRevision, boolean forceNew) {
        requireAccess(userId);
        AiConversationSession session = requireOwned(userId, id);
        Instant now = Instant.now();
        if (!"ACTIVE".equals(session.getStatus()) || session.getEndedAt() != null) {
            throw new ApiException(ErrorCode.CONFLICT, "Phòng hội thoại đã kết thúc.",
                    java.util.Map.of("reason", "AI_SESSION_CLOSED"));
        }
        if (!session.getExpiresAt().isAfter(now)) {
            throw new ApiException(ErrorCode.CONFLICT, "Phiên hội thoại đã hết thời gian.",
                    java.util.Map.of("reason", "AI_SESSION_EXPIRED"));
        }
        if (dailyQuota(userId, now).remainingSeconds() <= 0) {
            throw new ApiException(ErrorCode.RATE_LIMITED, "Bạn đã dùng hết thời gian AI Voice hôm nay.",
                    java.util.Map.of("reason", "AI_DAILY_QUOTA_EXHAUSTED"));
        }
        reconnectLimiter.acquire(userId, now);
        historyService.save(session, history, historyRevision);
        boolean resume = !forceNew && hasHandle(resumptionHandle) && session.getConnectionPrompt() != null;
        GeminiProviderPool.Credential credential;
        try {
            credential = providerPool.forSession(session.getProviderId(), session.getModel());
        } catch (ApiException unavailable) {
            // A handle may never move to a different Google project. Only a deliberately
            // fresh connection can use another project and rehydrate the archived conversation.
            if (!forceNew) throw unavailable;
            credential = providerPool.acquire();
        }
        if (!resume) {
            session.setConnectionPrompt(conversationPrompt.build(session.getTopic(), session.getCefrLevel(),
                    historyService.promptContext(session)));
        }
        var token = issueToken(session, credential, resume ? resumptionHandle : null, now);
        session.setProviderId(credential.providerId());
        session.setModel(credential.model());
        long leaseRemaining = Duration.between(now, session.getExpiresAt()).getSeconds();
        int handoffSeconds = dailyQuota(userId, now).remainingSeconds() > leaseRemaining
                ? properties.aiConversation().handoffSecondsBeforeExpiry() : 0;
        return new CreatedSession(session, token.value(), token.newSessionExpiresAt(), handoffSeconds,
                resume, historyService.read(session));
    }

    @Transactional
    public long saveHistory(String userId, String id, List<HistoryTurn> history, Long revision) {
        return historyService.save(requireOwned(userId, id), history, revision);
    }

    private GeminiEphemeralTokenClient.Token issueToken(AiConversationSession session,
            GeminiProviderPool.Credential credential, String handle, Instant now) {
        int minutes = (int) Math.max(1, (Duration.between(now, session.getExpiresAt()).getSeconds() + 59) / 60);
        try {
            var token = tokenClient.create(session.getConnectionPrompt(), credential, minutes, handle, session.getVoice());
            providerPool.success(credential.providerId());
            return token;
        } catch (RuntimeException ex) {
            providerPool.failure(credential.providerId(), ex.getMessage());
            throw ex;
        }
    }

    private boolean hasHandle(String handle) { return handle != null && !handle.isBlank(); }

    @Transactional
    public void saveSummary(String userId, String id, String summary, long inputTokens, long outputTokens,
            Long connectLatencyMs, int reconnectCount, int disconnectCount, int rateLimitCount) {
        AiConversationSession session = requireOwned(userId, id);
        if (summary != null && summary.length() > 20_000) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Tóm tắt vượt giới hạn 20.000 ký tự.");
        }
        if (summary != null) session.setSummary(summary);
        session.setInputTokens(Math.max(session.getInputTokens(), inputTokens));
        session.setOutputTokens(Math.max(session.getOutputTokens(), outputTokens));
        if (connectLatencyMs != null) session.setConnectLatencyMs(Math.max(0, connectLatencyMs));
        session.setReconnectCount(Math.max(session.getReconnectCount(), reconnectCount));
        session.setDisconnectCount(Math.max(session.getDisconnectCount(), disconnectCount));
        session.setRateLimitCount(Math.max(session.getRateLimitCount(), rateLimitCount));
    }

    /** Ghi lượt nói mới. Chỉ chủ phiên mới ghi được. */
    @Transactional
    public void appendTurns(String userId, String sessionId,
            List<vn.weconex.aptis.conversation.web.AiConversationController.TurnItem> turns) {
        AiConversationSession session = requireOwned(userId, sessionId);
        if (turns == null || turns.isEmpty()) return;
        memoryService.appendTurns(userId, sessionId, turns.stream()
                .map(t -> new AiConversationMemoryService.TurnInput(t.role(), t.content(), t.seq(), t.revision()))
                .toList());
        historyService.reconcileLegacyArchive(session);
    }

    @Transactional
    public void close(String userId, String id, String error) {
        AiConversationSession session = requireOwned(userId, id);
        session.setStatus(error == null || error.isBlank() ? "CLOSED" : "ERROR");
        if (session.getEndedAt() == null) session.setEndedAt(Instant.now());
        if (error != null) session.setErrorMessage(error.substring(0, Math.min(500, error.length())));
        // Durable history is authoritative. Closing a room must never wait for an
        // external text model, and no background task may race the final history save.
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
            Instant naturalEnd = session.getEndedAt() != null ? session.getEndedAt() : now;
            if (naturalEnd.isAfter(session.getExpiresAt())) naturalEnd = session.getExpiresAt();
            Instant end = naturalEnd.isAfter(dayEnd) ? dayEnd : naturalEnd;
            if (end.isAfter(start)) used += Duration.between(start, end).getSeconds();
        }
        return new DailyQuota(limit, Math.min(limit, used), Math.max(0, limit - used));
    }

    private AiConversationSession requireOwned(String userId, String id) {
        return repository.findOwnedForUpdate(userId, id)
                .orElseThrow(() -> ApiException.notFound("AiConversationSession", id));
    }

    public record CreatedSession(AiConversationSession session, String ephemeralToken,
            Instant tokenStartExpiresAt, int handoffSecondsBeforeExpiry, boolean resumeAttempted,
            List<HistoryTurn> history) {}
    public record DailyQuota(long limitSeconds, long usedSeconds, long remainingSeconds) {}
}
