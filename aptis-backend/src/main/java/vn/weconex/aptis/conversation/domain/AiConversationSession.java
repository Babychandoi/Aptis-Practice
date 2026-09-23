package vn.weconex.aptis.conversation.domain;

import java.time.Instant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

@Entity
@Table(name = "ai_conversation_sessions")
@Getter @Setter @NoArgsConstructor
public class AiConversationSession extends BaseEntity {
    @Column(name = "user_id", columnDefinition = "CHAR(36)", nullable = false)
    private String userId;
    @Column(name = "status", length = 20, nullable = false)
    private String status;
    @Column(name = "topic", length = 100, nullable = false)
    private String topic;
    @Column(name = "cefr_level", length = 4, nullable = false)
    private String cefrLevel;
    @Column(name = "model", length = 120, nullable = false)
    private String model;
    @Column(name = "provider_id", columnDefinition = "CHAR(36)")
    private String providerId;
    @Column(name = "voice", length = 30, nullable = false)
    private String voice = "Aoede";
    @Column(name = "history_json", columnDefinition = "LONGTEXT")
    private String historyJson;
    @Column(name = "history_revision", nullable = false)
    private long historyRevision;
    @Column(name = "connection_prompt", columnDefinition = "LONGTEXT")
    private String connectionPrompt;
    @Column(name = "memory_context", columnDefinition = "LONGTEXT")
    private String memoryContext;
    @Column(name = "started_at", nullable = false)
    private Instant startedAt;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "ended_at")
    private Instant endedAt;
    @Column(name = "previous_session_id", columnDefinition = "CHAR(36)")
    private String previousSessionId;
    @Column(name = "summary", columnDefinition = "json")
    private String summary;
    @Column(name = "input_tokens", nullable = false)
    private long inputTokens;
    @Column(name = "output_tokens", nullable = false)
    private long outputTokens;
    @Column(name = "connect_latency_ms")
    private Long connectLatencyMs;
    @Column(name = "reconnect_count", nullable = false)
    private int reconnectCount;
    @Column(name = "disconnect_count", nullable = false)
    private int disconnectCount;
    @Column(name = "rate_limit_count", nullable = false)
    private int rateLimitCount;
    @Column(name = "error_message", length = 500)
    private String errorMessage;
}
