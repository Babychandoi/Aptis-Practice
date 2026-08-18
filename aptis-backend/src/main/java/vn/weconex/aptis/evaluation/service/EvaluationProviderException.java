package vn.weconex.aptis.evaluation.service;

/**
 * A transient or malformed response from an external evaluation provider.
 * Keeping this separate from content/data errors lets the worker retry and
 * eventually use the deterministic fallback without hiding broken rubrics.
 */
public class EvaluationProviderException extends RuntimeException {

    public EvaluationProviderException(String message) {
        super(message);
    }

    public EvaluationProviderException(String message, Throwable cause) {
        super(message, cause);
    }
}
