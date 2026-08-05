package vn.weconex.aptis.common.exception;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Body lỗi thống nhất cho toàn bộ API.
 */
public record ApiErrorResponse(
        String code,
        String message,
        Map<String, Object> details,
        List<FieldError> fieldErrors,
        String path,
        Instant timestamp) {

    public record FieldError(String field, String message) {
    }

    public static ApiErrorResponse of(ErrorCode code, String message, Map<String, Object> details, String path) {
        return new ApiErrorResponse(code.name(), message, details, null, path, Instant.now());
    }

    public static ApiErrorResponse validation(List<FieldError> fieldErrors, String path) {
        return new ApiErrorResponse(
                ErrorCode.VALIDATION_FAILED.name(),
                "Dữ liệu không hợp lệ",
                null,
                fieldErrors,
                path,
                Instant.now());
    }
}
