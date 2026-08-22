package vn.weconex.aptis.common.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình nghiệp vụ, map từ prefix {@code aptis} trong application.yml.
 */
@ConfigurationProperties(prefix = "aptis")
public record AptisProperties(
        Jwt jwt,
        RefreshCookie refreshCookie,
        Security security,
        Cors cors,
        Minio minio,
        Practice practice,
        Entitlement entitlement,
        Outbox outbox) {

    public record Jwt(
            String secret,
            String issuer,
            Duration accessTokenTtl,
            Duration refreshTokenTtl) {
    }

    public record RefreshCookie(
            String name,
            boolean secure,
            String sameSite,
            String domain) {
    }

    public record Security(
            int maxFailedLoginAttempts,
            Duration lockDuration,
            Duration emailVerificationTtl,
            Duration passwordResetTtl,
            /** true = mỗi tài khoản chỉ giữ một phiên; đăng nhập mới đẩy phiên cũ ra. */
            boolean singleSession) {
    }

    public record Cors(List<String> allowedOrigins) {
    }

    public record Minio(
            String endpoint,
            String accessKey,
            String secretKey,
            String publicEndpoint,
            Duration presignedUrlTtl,
            Buckets buckets) {

        public record Buckets(
                String publicBucket,
                String content,
                String userRecordings,
                String userUploads,
                String imports,
                String exports) {

            public List<String> all() {
                return List.of(publicBucket, content, userRecordings, userUploads, imports, exports);
            }
        }
    }

    /**
     * @param mergeItemParts partId -> số câu của một đề, cho các Part mà mỗi bộ
     *                       câu hỏi chỉ chứa một câu và hệ thống tự gom lại
     */
    public record Practice(
            int defaultPartPracticeSize,
            int maxCustomPracticeSize,
            Duration avoidRepeatWindow,
            Duration attemptExpiryGrace,
            java.util.Map<String, Integer> mergeItemParts) {

        /** Số câu mỗi đề của Part, hoặc rỗng nếu Part không gộp câu. */
        public java.util.Optional<Integer> mergeSizeOf(String partId) {
            if (mergeItemParts == null || partId == null) {
                return java.util.Optional.empty();
            }
            return java.util.Optional.ofNullable(mergeItemParts.get(partId))
                    .filter(size -> size > 1);
        }
    }

    /**
     * @param renewalPolicy EXTEND_CURRENT hoặc QUEUE_NEXT (PHẦN IV §34)
     */
    public record Entitlement(String premiumCode, RenewalPolicy renewalPolicy) {

        public enum RenewalPolicy {
            EXTEND_CURRENT,
            QUEUE_NEXT
        }
    }

    public record Outbox(Duration pollInterval, int batchSize, int maxRetry) {
    }
}
