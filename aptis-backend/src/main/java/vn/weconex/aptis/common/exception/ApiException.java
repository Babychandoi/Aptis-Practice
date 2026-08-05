package vn.weconex.aptis.common.exception;

import java.util.Map;

/**
 * Lỗi nghiệp vụ có mã xác định. Message chỉ dùng cho log — client đọc
 * {@link ErrorCode} và {@code details}.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode code;
    private final Map<String, Object> details;

    public ApiException(ErrorCode code) {
        this(code, code.name(), Map.of());
    }

    public ApiException(ErrorCode code, String message) {
        this(code, message, Map.of());
    }

    public ApiException(ErrorCode code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = details == null ? Map.of() : Map.copyOf(details);
    }

    public ErrorCode code() {
        return code;
    }

    public Map<String, Object> details() {
        return details;
    }

    // --- Factory cho các lỗi hay dùng ---

    public static ApiException notFound(String resource, Object id) {
        return new ApiException(
                ErrorCode.RESOURCE_NOT_FOUND,
                resource + " not found: " + id,
                Map.of("resource", resource));
    }

    public static ApiException premiumRequired() {
        return new ApiException(ErrorCode.PREMIUM_REQUIRED, "Premium entitlement required");
    }

    public static ApiException forbidden(String reason) {
        return new ApiException(ErrorCode.FORBIDDEN, reason);
    }
}
