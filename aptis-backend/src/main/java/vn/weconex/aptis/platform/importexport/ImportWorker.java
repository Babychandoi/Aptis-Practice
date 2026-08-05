package vn.weconex.aptis.platform.importexport;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.util.Enums.AssetStatus;
import vn.weconex.aptis.common.util.Enums.AssetType;

/**
 * Xử lý job import câu hỏi.
 *
 * <p>Tách khỏi {@link QuestionSetImporter} vì cần gọi
 * {@code importer.importOne} qua proxy Spring để mỗi bộ có transaction riêng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportWorker {

    private static final String XLSX_MIME =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ImportJobRepository jobRepository;
    private final AssetRepository assetRepository;
    private final MinioStorageClient storageClient;
    private final QuestionSetExcelParser parser;
    private final QuestionSetImporter importer;
    private final AssetZipImporter zipImporter;
    private final ImportJobStatusWriter statusWriter;
    private final AptisProperties properties;

    /**
     * @return số job đã xử lý
     */
    public int processQueued(int batchSize) {
        List<ImportJob> queued = jobRepository
                .findByStatusOrderByQueuedAt(ImportJob.ImportStatus.QUEUED).stream()
                .limit(batchSize)
                .toList();

        int processed = 0;
        for (ImportJob job : queued) {
            if (processOne(job.getId())) {
                processed++;
            }
        }
        return processed;
    }

    /**
     * Xử lý một job. Không có transaction ở tầng này: từng bộ câu hỏi commit
     * riêng, và trạng thái job ghi qua {@link ImportJobStatusWriter}.
     */
    public boolean processOne(String jobId) {
        ImportJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null || job.getStatus() != ImportJob.ImportStatus.QUEUED) {
            return false;
        }

        statusWriter.markProcessing(jobId);

        try {
            Asset source = assetRepository.findById(job.getSourceAssetId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Không tìm thấy file import " + job.getSourceAssetId()));

            if (!source.isReady()) {
                throw new IllegalStateException(
                        "File import chưa READY (đang " + source.getStatus() + ")");
            }

            byte[] content = storageClient.download(
                    source.getBucketName(), source.getObjectKey());

            if (job.getImportType() == ImportJob.ImportType.ASSET_ZIP) {
                return importAssetZip(job, content);
            }

            QuestionSetExcelParser.ParseResult parsed = parser.parse(content);

            // Lỗi cấu trúc file (thiếu cột) làm cả file không dùng được
            if (parsed.rows().isEmpty() && !parsed.errors().isEmpty()) {
                String reportAssetId = writeErrorReport(job, parsed.errors());
                statusWriter.markFinished(jobId, 0, 0, parsed.errors().size(), reportAssetId);
                return true;
            }

            var grouped = importer.groupByCode(parsed.rows());
            List<String> errors = new ArrayList<>(parsed.errors());
            int success = 0;

            for (var entry : grouped.entrySet()) {
                try {
                    // Gọi qua proxy để mỗi bộ có transaction riêng
                    importer.importOne(job.getCreatedBy(), entry.getKey(), entry.getValue());
                    success++;
                } catch (Exception ex) {
                    errors.add("Dòng %d (code %s): %s".formatted(
                            entry.getValue().get(0).rowNumber(),
                            entry.getKey(),
                            ex.getMessage()));
                }
            }

            String reportAssetId = errors.isEmpty() ? null : writeErrorReport(job, errors);
            statusWriter.markFinished(
                    jobId, grouped.size(), success, errors.size(), reportAssetId);

            log.info("Import {} xong: {}/{} bộ câu hỏi, {} lỗi",
                    jobId, success, grouped.size(), errors.size());
            return true;

        } catch (Exception ex) {
            statusWriter.markFailed(jobId, ex.getMessage());
            log.error("Import {} thất bại: {}", jobId, ex.getMessage());
            return false;
        }
    }

    /**
     * Nhập gói ZIP audio/ảnh. Đếm theo số file thay vì số bộ câu hỏi.
     */
    private boolean importAssetZip(ImportJob job, byte[] content) {
        AssetZipImporter.ZipImportResult result =
                zipImporter.importAll(job.getCreatedBy(), content);

        String reportAssetId = result.errors().isEmpty()
                ? null
                : writeErrorReport(job, result.errors());

        statusWriter.markFinished(
                job.getId(),
                result.totalFiles(),
                result.successCount(),
                result.errors().size(),
                reportAssetId);

        log.info("Import ZIP {} xong: {}/{} file, {} lỗi",
                job.getId(), result.successCount(), result.totalFiles(), result.errors().size());
        return true;
    }

    /**
     * Ghi danh sách lỗi thành file Excel để người dùng tải về sửa.
     */
    private String writeErrorReport(ImportJob job, List<String> errors) {
        try (var workbook = new XSSFWorkbook();
             var output = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Loi import");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("STT");
            header.createCell(1).setCellValue("Loi");

            for (int index = 0; index < errors.size(); index++) {
                Row row = sheet.createRow(index + 1);
                row.createCell(0).setCellValue(index + 1);
                row.createCell(1).setCellValue(errors.get(index));
            }
            sheet.setColumnWidth(1, 20_000);

            workbook.write(output);
            byte[] content = output.toByteArray();

            String bucket = properties.minio().buckets().imports();
            String assetId = java.util.UUID.randomUUID().toString();
            String objectKey = "imports/%s/%s/errors-%s.xlsx"
                    .formatted(job.getCreatedBy(), job.getId(), assetId);

            storageClient.upload(bucket, objectKey, content, XLSX_MIME);

            Asset asset = new Asset();
            asset.setId(assetId);
            asset.setBucketName(bucket);
            asset.setObjectKey(objectKey);
            asset.setAssetType(AssetType.EXPORT_FILE);
            asset.setMimeType(XLSX_MIME);
            asset.setOriginalFilename("errors.xlsx");
            asset.setFileSize((long) content.length);
            asset.setStatus(AssetStatus.READY);
            asset.setOwnerUserId(job.getCreatedBy());
            asset.setCreatedBy(job.getCreatedBy());
            assetRepository.save(asset);

            return assetId;

        } catch (Exception ex) {
            // Không ghi được báo lỗi thì vẫn phải chốt trạng thái job
            log.warn("Không tạo được file báo lỗi cho import {}: {}",
                    job.getId(), ex.getMessage());
            return null;
        }
    }
}
