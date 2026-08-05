package vn.weconex.aptis.common.util;

/**
 * Enum dùng chung nhiều module. Tên hằng phải trùng giá trị ENUM trong MySQL.
 */
public final class Enums {

    private Enums() {
    }

    public enum AccessLevel {
        FREE,
        PREMIUM
    }

    public enum CefrLevel {
        A1,
        A2,
        B1,
        B2,
        C1,
        C2
    }

    public enum PracticeMode {
        PART_PRACTICE,
        CUSTOM_PRACTICE,
        MOCK_TEST
    }

    public enum UserStatus {
        PENDING_VERIFICATION,
        ACTIVE,
        LOCKED,
        SUSPENDED,
        DELETED
    }

    public enum ContentStatus {
        DRAFT,
        IN_REVIEW,
        PUBLISHED,
        SUSPENDED,
        ARCHIVED
    }

    public enum PublishStatus {
        DRAFT,
        PUBLISHED,
        ARCHIVED
    }

    public enum AttemptStatus {
        CREATED,
        IN_PROGRESS,
        SUBMITTED,
        SCORING,
        COMPLETED,
        EXPIRED,
        ABANDONED,
        CANCELLED;

        public boolean isTerminal() {
            return this == COMPLETED || this == EXPIRED || this == ABANDONED || this == CANCELLED;
        }

        public boolean acceptsResponses() {
            return this == CREATED || this == IN_PROGRESS;
        }
    }

    public enum AttemptItemStatus {
        NOT_STARTED,
        IN_PROGRESS,
        ANSWERED,
        SCORED,
        SKIPPED
    }

    public enum ResponseType {
        SINGLE_CHOICE,
        MULTIPLE_CHOICE,
        GAP_FILL_CHOICE,
        MATCHING,
        ORDERING,
        SENTENCE_ORDERING,
        SHORT_TEXT,
        TEXT_EXACT,
        LONG_TEXT,
        AUDIO_RECORDING
    }

    public enum SubscriptionStatus {
        PENDING,
        ACTIVE,
        EXPIRED,
        CANCELLED,
        REVOKED
    }

    public enum EntitlementSourceType {
        SUBSCRIPTION,
        PROMOTION,
        ADMIN_GRANT,
        TRIAL
    }

    public enum OrderStatus {
        PENDING,
        AWAITING_PAYMENT,
        PAID,
        CANCELLED,
        EXPIRED,
        REFUNDED,
        PARTIALLY_REFUNDED
    }

    public enum PaymentStatus {
        INITIATED,
        PENDING,
        SUCCESS,
        FAILED,
        CANCELLED,
        EXPIRED,
        REFUNDED
    }

    public enum AssetType {
        IMAGE,
        AUDIO,
        VIDEO,
        DOCUMENT,
        USER_RECORDING,
        AVATAR,
        IMPORT_FILE,
        EXPORT_FILE
    }

    public enum AssetStatus {
        UPLOADING,
        READY,
        FAILED,
        DELETED
    }

    public enum AccessScope {
        PUBLIC,
        PRIVATE,
        SIGNED_URL
    }

    public enum EvaluationType {
        SPEAKING_AI,
        WRITING_AI,
        SPEAKING_TEACHER,
        WRITING_TEACHER
    }

    public enum JobStatus {
        QUEUED,
        PROCESSING,
        COMPLETED,
        FAILED,
        CANCELLED
    }

    public enum SelectionStrategy {
        RANDOM,
        NEW_FIRST,
        WEAK_FIRST,
        FIXED
    }

    public enum ResourceType {
        QUESTION_SET,
        COMPONENT,
        PART,
        MOCK_TEST
    }

    public enum OutboxStatus {
        PENDING,
        PROCESSING,
        PUBLISHED,
        FAILED
    }
}
