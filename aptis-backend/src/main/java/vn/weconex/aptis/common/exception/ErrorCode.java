package vn.weconex.aptis.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Mã lỗi trả cho client. Frontend map mã này sang thông báo tiếng Việt,
 * nên không đổi tên mã sau khi đã phát hành.
 */
public enum ErrorCode {

    // --- Chung ---
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND),
    CONFLICT(HttpStatus.CONFLICT),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS),

    // --- Auth ---
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED),
    FORBIDDEN(HttpStatus.FORBIDDEN),
    EMAIL_ALREADY_USED(HttpStatus.CONFLICT),
    PHONE_ALREADY_USED(HttpStatus.CONFLICT),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN),
    ACCOUNT_LOCKED(HttpStatus.FORBIDDEN),
    ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_REUSED(HttpStatus.UNAUTHORIZED),
    /** Phiên bị đẩy ra vì tài khoản đăng nhập ở thiết bị khác (chính sách một phiên). */
    SESSION_REPLACED(HttpStatus.UNAUTHORIZED),

    // --- Nội dung & quyền truy cập ---
    PREMIUM_REQUIRED(HttpStatus.FORBIDDEN),
    CONTENT_NOT_PUBLISHED(HttpStatus.FORBIDDEN),
    QUESTION_SET_CONTENT_MISSING(HttpStatus.INTERNAL_SERVER_ERROR),
    NOT_ENOUGH_QUESTION_SETS(HttpStatus.UNPROCESSABLE_ENTITY),
    PUBLISH_VALIDATION_FAILED(HttpStatus.UNPROCESSABLE_ENTITY),
    INVALID_CONTENT_STATE_TRANSITION(HttpStatus.CONFLICT),

    // --- Lượt làm bài ---
    ATTEMPT_NOT_FOUND(HttpStatus.NOT_FOUND),
    ATTEMPT_NOT_OWNED(HttpStatus.FORBIDDEN),
    ATTEMPT_ALREADY_SUBMITTED(HttpStatus.CONFLICT),
    ATTEMPT_EXPIRED(HttpStatus.CONFLICT),
    ATTEMPT_NOT_STARTED(HttpStatus.CONFLICT),
    ATTEMPT_INVALID_STATE(HttpStatus.CONFLICT),
    RESULT_NOT_READY(HttpStatus.CONFLICT),
    AUDIO_PLAY_LIMIT_REACHED(HttpStatus.CONFLICT),

    // --- Asset ---
    ASSET_NOT_READY(HttpStatus.CONFLICT),
    ASSET_TYPE_NOT_ALLOWED(HttpStatus.BAD_REQUEST),
    ASSET_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE),
    ASSET_CHECKSUM_MISMATCH(HttpStatus.BAD_REQUEST),
    STORAGE_ERROR(HttpStatus.BAD_GATEWAY),

    // --- Thanh toán ---
    PLAN_NOT_AVAILABLE(HttpStatus.UNPROCESSABLE_ENTITY),
    ORDER_NOT_PAYABLE(HttpStatus.CONFLICT),
    ORDER_ALREADY_PAID(HttpStatus.CONFLICT),
    PAYMENT_AMOUNT_MISMATCH(HttpStatus.UNPROCESSABLE_ENTITY),
    PAYMENT_PROVIDER_ERROR(HttpStatus.BAD_GATEWAY),
    WEBHOOK_SIGNATURE_INVALID(HttpStatus.UNAUTHORIZED),
    PROMOTION_CODE_INVALID(HttpStatus.UNPROCESSABLE_ENTITY),
    PROMOTION_CODE_EXHAUSTED(HttpStatus.UNPROCESSABLE_ENTITY);

    private final HttpStatus status;

    ErrorCode(HttpStatus status) {
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
