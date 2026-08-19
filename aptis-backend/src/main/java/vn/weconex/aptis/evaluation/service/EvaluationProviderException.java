package vn.weconex.aptis.evaluation.service;

/**
 * A transient or malformed response from an external evaluation provider.
 * Keeping this separate from content/data errors lets the worker retry and
 * eventually use the deterministic fallback without hiding broken rubrics.
 *
 * <p>{@link #isRetryable()} phân biệt hai nhóm lỗi rất khác nhau:
 * <ul>
 *   <li>{@code true} — lỗi tạm thời (JSON bị cắt, content rỗng, provider sập).
 *       Gọi lại có thể ra kết quả khác nên đáng retry.</li>
 *   <li>{@code false} — lỗi tất định (JSON đúng cú pháp nhưng sai schema: thiếu
 *       mảng criteria, trùng mã tiêu chí, score không phải số). Gọi lại cùng
 *       input sẽ ra cùng kết quả, nên retry chỉ đốt token và làm học viên chờ
 *       thêm. Worker fallback ngay.</li>
 * </ul>
 */
public class EvaluationProviderException extends RuntimeException {

    private final boolean retryable;

    public EvaluationProviderException(String message) {
        this(message, null, true);
    }

    public EvaluationProviderException(String message, Throwable cause) {
        this(message, cause, true);
    }

    public EvaluationProviderException(String message, Throwable cause, boolean retryable) {
        super(message, cause);
        this.retryable = retryable;
    }

    public boolean isRetryable() {
        return retryable;
    }
}
