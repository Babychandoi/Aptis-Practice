package vn.weconex.aptis.conversation.web;

import java.time.Instant;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.conversation.domain.GeminiLiveProvider;
import vn.weconex.aptis.conversation.repository.AiConversationSessionRepository;
import vn.weconex.aptis.conversation.repository.GeminiLiveProviderRepository;
import vn.weconex.aptis.conversation.service.GeminiEphemeralTokenClient;
import vn.weconex.aptis.conversation.service.GeminiKeyCipher;

@RestController
@RequestMapping("/api/v1/admin/gemini-providers")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('plan:write')")
public class AdminGeminiProviderController {
    private static final List<String> LIVE = List.of("CREATED", "ACTIVE", "HANDOFF");
    private static final List<Integer> CAPACITY_STAGES = List.of(10, 25, 50, 100);
    private final GeminiLiveProviderRepository repository;
    private final AiConversationSessionRepository sessions;
    private final GeminiKeyCipher cipher;
    private final GeminiEphemeralTokenClient tokenClient;
    private final AptisProperties properties;

    @GetMapping
    public List<ProviderResponse> list() {
        Instant now = Instant.now();
        return repository.findAllByOrderByPriorityAscCreatedAtAsc().stream()
                .map(p -> ProviderResponse.from(p,
                        sessions.countByProviderIdAndStatusInAndExpiresAtAfter(p.getId(), LIVE, now)))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ProviderResponse create(@Valid @RequestBody SaveProviderRequest request) {
        if (repository.existsByNameIgnoreCase(request.name().strip()))
            throw new ApiException(vn.weconex.aptis.common.exception.ErrorCode.CONFLICT, "Tên Gemini project đã tồn tại");
        GeminiLiveProvider provider = new GeminiLiveProvider();
        apply(provider, request, true);
        return ProviderResponse.from(repository.save(provider), 0);
    }

    @PatchMapping("/{id}")
    @Transactional
    public ProviderResponse update(@PathVariable String id, @Valid @RequestBody SaveProviderRequest request) {
        GeminiLiveProvider provider = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("GeminiLiveProvider", id));
        apply(provider, request, false);
        long active = sessions.countByProviderIdAndStatusInAndExpiresAtAfter(id, LIVE, Instant.now());
        return ProviderResponse.from(provider, active);
    }

    @PostMapping("/{id}/test")
    @Transactional
    public TestResponse test(@PathVariable String id) {
        GeminiLiveProvider provider = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("GeminiLiveProvider", id));
        try {
            String model = properties.aiConversation().model();
            tokenClient.testCredential(cipher.decrypt(provider.getEncryptedApiKey()), model);
            provider.setConsecutiveFailures(0);
            provider.setLastSuccessAt(Instant.now());
            provider.setLastError(null);
            return new TestResponse(true, "Key và model " + model + " dùng được; Gemini đã cấp ephemeral token");
        } catch (RuntimeException ex) {
            provider.setConsecutiveFailures(provider.getConsecutiveFailures() + 1);
            provider.setLastErrorAt(Instant.now());
            provider.setLastError(ex.getMessage());
            throw ex;
        }
    }

    private void apply(GeminiLiveProvider provider, SaveProviderRequest request, boolean creating) {
        if (!CAPACITY_STAGES.contains(request.maxConcurrent())) {
            throw new ApiException(vn.weconex.aptis.common.exception.ErrorCode.VALIDATION_FAILED,
                    "Capacity chỉ được chọn theo các nấc benchmark 10, 25, 50 hoặc 100");
        }
        provider.setName(request.name().strip());
        provider.setProjectId(blankToNull(request.projectId()));
        provider.setEnabled(request.enabled());
        provider.setPriority(request.priority());
        provider.setMaxConcurrent(request.maxConcurrent());
        if (request.apiKey() != null && !request.apiKey().isBlank()) {
            String key = request.apiKey().strip();
            provider.setEncryptedApiKey(cipher.encrypt(key));
            provider.setKeySuffix(key.substring(Math.max(0, key.length() - 6)));
        } else if (creating) {
            throw new ApiException(vn.weconex.aptis.common.exception.ErrorCode.VALIDATION_FAILED, "API key là bắt buộc");
        }
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.strip(); }

    public record SaveProviderRequest(@NotBlank @Size(max=100) String name,
            @Size(max=120) String projectId, @Size(max=500) String apiKey,
            boolean enabled, @Min(1) @Max(10000) int priority,
            @Min(10) @Max(100) int maxConcurrent) {}
    public record ProviderResponse(String id, String name, String projectId, String maskedKey,
            boolean enabled, int priority, int maxConcurrent, long activeSessions,
            int consecutiveFailures, Instant lastSuccessAt, Instant lastErrorAt, String lastError) {
        static ProviderResponse from(GeminiLiveProvider p, long active) {
            return new ProviderResponse(p.getId(), p.getName(), p.getProjectId(), "••••••" + p.getKeySuffix(),
                    p.isEnabled(), p.getPriority(), p.getMaxConcurrent(), active, p.getConsecutiveFailures(),
                    p.getLastSuccessAt(), p.getLastErrorAt(), p.getLastError());
        }
    }
    public record TestResponse(boolean success, String message) {}
}
