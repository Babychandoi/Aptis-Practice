package vn.weconex.aptis.platform.importexport;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Job xuất báo cáo (API §50).
 *
 * <p>File kết quả nằm ở MinIO bucket exports và có thời hạn — báo cáo chứa dữ
 * liệu học viên nên không giữ vô thời hạn.
 */
@Entity
@Table(name = "export_jobs")
@Getter
@Setter
@NoArgsConstructor
public class ExportJob {

    public enum ExportType {
        LEARNING_REPORT,
        REVENUE_REPORT,
        ATTEMPT_DETAIL,
        USER_LIST
    }

    public enum ExportStatus {
        QUEUED,
        PROCESSING,
        COMPLETED,
        FAILED
    }

    /** File export xóa sau 7 ngày. */
    private static final int RETENTION_DAYS = 7;

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "requested_by", columnDefinition = "CHAR(36)", nullable = false)
    private String requestedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "export_type", length = 32, nullable = false)
    private ExportType exportType;

    @Column(name = "params_json", columnDefinition = "JSON")
    private String paramsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private ExportStatus status = ExportStatus.QUEUED;

    @Column(name = "result_asset_id", columnDefinition = "CHAR(36)")
    private String resultAssetId;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "queued_at", nullable = false)
    private Instant queuedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static ExportJob queue(String requestedBy, ExportType type, String paramsJson) {
        ExportJob job = new ExportJob();
        job.requestedBy = requestedBy;
        job.exportType = type;
        job.paramsJson = paramsJson;
        return job;
    }

    public void markProcessing() {
        this.status = ExportStatus.PROCESSING;
    }

    public void markCompleted(String resultAssetId) {
        this.status = ExportStatus.COMPLETED;
        this.resultAssetId = resultAssetId;
        this.completedAt = Instant.now();
        this.expiresAt = Instant.now().plus(RETENTION_DAYS, ChronoUnit.DAYS);
    }

    public void markFailed(String error) {
        this.status = ExportStatus.FAILED;
        this.errorMessage = error;
        this.completedAt = Instant.now();
    }
}
