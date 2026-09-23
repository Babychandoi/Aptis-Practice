package vn.weconex.aptis.conversation.service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.conversation.domain.GeminiLiveProvider;
import vn.weconex.aptis.conversation.repository.AiConversationSessionRepository;
import vn.weconex.aptis.conversation.repository.GeminiLiveProviderRepository;

@Service
@RequiredArgsConstructor
public class GeminiProviderPool {
    private static final List<String> LIVE = List.of("CREATED", "ACTIVE", "HANDOFF");
    private final GeminiLiveProviderRepository providers;
    private final AiConversationSessionRepository sessions;
    private final GeminiKeyCipher cipher;
    private final AptisProperties properties;

    public boolean configured() {
        var cfg = properties.aiConversation();
        return !providers.findByEnabledTrueOrderByPriorityAscCreatedAtAsc().isEmpty()
                || cfg != null && cfg.enabled() && cfg.apiKey() != null && !cfg.apiKey().isBlank();
    }

    public Credential acquire() {
        var cfg = properties.aiConversation();
        if (cfg == null) throw unavailable();
        Instant now = Instant.now();
        var selected = providers.findByEnabledTrueOrderByPriorityAscCreatedAtAsc().stream()
                .map(p -> new Candidate(p, sessions.countByProviderIdAndStatusInAndExpiresAtAfter(p.getId(), LIVE, now)))
                .filter(c -> c.active < c.provider.getMaxConcurrent())
                .min(Comparator.comparingInt((Candidate c) -> c.provider.getPriority())
                        .thenComparingLong(c -> c.active)
                        .thenComparingInt(c -> c.provider.getConsecutiveFailures()))
                .orElse(null);
        if (selected != null) return new Credential(selected.provider.getId(), selected.provider.getName(),
                cipher.decrypt(selected.provider.getEncryptedApiKey()), cfg.model());
        if (cfg.enabled() && cfg.apiKey() != null && !cfg.apiKey().isBlank())
            return new Credential(null, "Environment", cfg.apiKey(), cfg.model());
        throw unavailable();
    }

    /** Resumption handles are scoped to the original project/model, not the pool. */
    public Credential forSession(String providerId, String model) {
        if (providerId != null) {
            var provider = providers.findById(providerId)
                    .filter(GeminiLiveProvider::isEnabled).orElseThrow(GeminiProviderPool::unavailable);
            return new Credential(providerId, provider.getName(),
                    cipher.decrypt(provider.getEncryptedApiKey()), model);
        }
        var cfg = properties.aiConversation();
        if (cfg != null && cfg.enabled() && cfg.apiKey() != null && !cfg.apiKey().isBlank()) {
            return new Credential(null, "Environment", cfg.apiKey(), model);
        }
        throw unavailable();
    }

    @Transactional
    public void success(String providerId) {
        if (providerId == null) return;
        providers.findById(providerId).ifPresent(p -> { p.setConsecutiveFailures(0); p.setLastSuccessAt(Instant.now()); p.setLastError(null); });
    }

    @Transactional
    public void failure(String providerId, String message) {
        if (providerId == null) return;
        providers.findById(providerId).ifPresent(p -> {
            p.setConsecutiveFailures(p.getConsecutiveFailures() + 1);
            p.setLastErrorAt(Instant.now());
            p.setLastError(message == null ? "Gemini request failed" : message.substring(0, Math.min(500, message.length())));
        });
    }

    private static ApiException unavailable() {
        return new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR, "Gemini Live chưa có key khả dụng");
    }
    private record Candidate(GeminiLiveProvider provider, long active) {}
    public record Credential(String providerId, String name, String apiKey, String model) {}
}
