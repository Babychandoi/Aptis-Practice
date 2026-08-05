package vn.weconex.aptis.platform.importexport;

import java.time.Instant;
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
 * Job import câu hỏi từ Excel (API §50).
 *
 * <p>Chạy bất đồng bộ vì file có thể hàng nghìn dòng. PARTIALLY_FAILED nghĩa là
 * một số dòng vào được, một số lỗi — người dùng tải file báo lỗi để sửa rồi
 * import lại phần còn thiếu.
 */
@Entity
@Table(name = "import_jobs")
@Getter
@Setter
@NoArgsConstructor
public class ImportJob {

    public enum ImportType {
        QUESTION_SET_EXCEL,
        ASSET_ZIP
    }

    public enum ImportStatus {
        QUEUED,
        PROCESSING,
        COMPLETED,
        PARTIALLY_FAILED,
        FAILED
    }

    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)", nullable = false, updatable = false)
    private String id;

    @Column(name = "created_by", columnDefinition = "CHAR(36)", nullable = false)
    private String createdBy;

    @Column(name = "source_asset_id", columnDefinition = "CHAR(36)", nullable = false)
    private String sourceAssetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "import_type", length = 32, nullable = false)
    private ImportType importType = ImportType.QUESTION_SET_EXCEL;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private ImportStatus status = ImportStatus.QUEUED;

    @Column(name = "total_rows", nullable = false)
    private int totalRows;

    @Column(name = "success_rows", nullable = false)
    private int successRows;

    @Column(name = "failed_rows", nullable = false)
    private int failedRows;

    @Column(name = "error_report_asset_id", columnDefinition = "CHAR(36)")
    private String errorReportAssetId;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "queued_at", nullable = false)
    private Instant queuedAt = Instant.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    void assignId() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
    }

    public static ImportJob queue(String createdBy, String sourceAssetId, ImportType type) {
        ImportJob job = new ImportJob();
        job.createdBy = createdBy;
        job.sourceAssetId = sourceAssetId;
        job.importType = type;
        return job;
    }

    public void markProcessing() {
        this.status = ImportStatus.PROCESSING;
        this.startedAt = Instant.now();
    }

    public void markFinished(int total, int success, int failed, String errorReportAssetId) {
        this.totalRows = total;
        this.successRows = success;
        this.failedRows = failed;
        this.errorReportAssetId = errorReportAssetId;
        this.completedAt = Instant.now();

        if (failed == 0) {
            this.status = ImportStatus.COMPLETED;
        } else if (success > 0) {
            this.status = ImportStatus.PARTIALLY_FAILED;
        } else {
            this.status = ImportStatus.FAILED;
        }
    }

    public void markFailed(String error) {
        this.status = ImportStatus.FAILED;
        this.errorMessage = error;
        this.completedAt = Instant.now();
    }
}
