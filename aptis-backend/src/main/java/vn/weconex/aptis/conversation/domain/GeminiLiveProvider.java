package vn.weconex.aptis.conversation.domain;

import java.time.Instant;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;

@Entity
@Table(name = "gemini_live_providers")
@Getter @Setter @NoArgsConstructor
public class GeminiLiveProvider extends BaseEntity {
    @Column(nullable = false, length = 100) private String name;
    @Column(name = "project_id", length = 120) private String projectId;
    @Column(name = "encrypted_api_key", nullable = false, columnDefinition = "TEXT") private String encryptedApiKey;
    @Column(name = "key_suffix", nullable = false, length = 8) private String keySuffix;
    @Column(nullable = false) private boolean enabled = true;
    @Column(nullable = false) private int priority = 100;
    @Column(name = "max_concurrent", nullable = false) private int maxConcurrent = 10;
    @Column(name = "consecutive_failures", nullable = false) private int consecutiveFailures;
    @Column(name = "last_success_at") private Instant lastSuccessAt;
    @Column(name = "last_error_at") private Instant lastErrorAt;
    @Column(name = "last_error", length = 500) private String lastError;
}
