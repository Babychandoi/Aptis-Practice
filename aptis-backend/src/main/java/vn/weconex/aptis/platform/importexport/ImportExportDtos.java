package vn.weconex.aptis.platform.importexport;

import java.time.Instant;
import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public final class ImportExportDtos {

    private ImportExportDtos() {
    }

    /**
     * File Excel phải upload trước qua Asset API; đây chỉ nhận assetId.
     * Nhờ vậy import dùng chung luồng upload an toàn với mọi file khác.
     */
    public record CreateImportJobRequest(
            @NotBlank String sourceAssetId,
            ImportJob.ImportType importType) {
    }

    public record ImportJobResponse(
            String id,
            String importType,
            String status,
            int totalRows,
            int successRows,
            int failedRows,
            /** Tải qua Asset API để lấy signed URL */
            String errorReportAssetId,
            String errorMessage,
            Instant queuedAt,
            Instant completedAt) {

        public static ImportJobResponse from(ImportJob job) {
            return new ImportJobResponse(
                    job.getId(),
                    job.getImportType().name(),
                    job.getStatus().name(),
                    job.getTotalRows(),
                    job.getSuccessRows(),
                    job.getFailedRows(),
                    job.getErrorReportAssetId(),
                    job.getErrorMessage(),
                    job.getQueuedAt(),
                    job.getCompletedAt());
        }
    }

    public record CreateExportJobRequest(
            @NotNull ExportJob.ExportType exportType,
            Map<String, Object> params) {
    }

    public record ExportJobResponse(
            String id,
            String exportType,
            String status,
            String resultAssetId,
            String errorMessage,
            Instant queuedAt,
            Instant completedAt,
            Instant expiresAt) {

        public static ExportJobResponse from(ExportJob job) {
            return new ExportJobResponse(
                    job.getId(),
                    job.getExportType().name(),
                    job.getStatus().name(),
                    job.getResultAssetId(),
                    job.getErrorMessage(),
                    job.getQueuedAt(),
                    job.getCompletedAt(),
                    job.getExpiresAt());
        }
    }
}
