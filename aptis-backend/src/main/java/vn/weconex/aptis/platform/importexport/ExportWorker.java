package vn.weconex.aptis.platform.importexport;

import java.io.ByteArrayOutputStream;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.util.Enums.AssetStatus;
import vn.weconex.aptis.common.util.Enums.AssetType;

/**
 * Sinh báo cáo Excel (PHẦN I §9).
 *
 * <p>Dùng {@link JdbcTemplate} thay vì JPA: báo cáo là truy vấn tổng hợp nhiều
 * bảng, nạp entity không có lợi gì mà tốn bộ nhớ.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExportWorker {

    private static final String XLSX_MIME =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private static final DateTimeFormatter TIMESTAMP =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneOffset.UTC);

    private final ExportJobRepository jobRepository;
    private final AssetRepository assetRepository;
    private final MinioStorageClient storageClient;
    private final ExportJobStatusWriter statusWriter;
    private final JdbcTemplate jdbc;
    private final AptisProperties properties;

    public int processQueued(int batchSize) {
        List<ExportJob> queued = jobRepository
                .findByStatusOrderByQueuedAt(ExportJob.ExportStatus.QUEUED).stream()
                .limit(batchSize)
                .toList();

        int processed = 0;
        for (ExportJob job : queued) {
            if (processOne(job.getId())) {
                processed++;
            }
        }
        return processed;
    }

    public boolean processOne(String jobId) {
        ExportJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null || job.getStatus() != ExportJob.ExportStatus.QUEUED) {
            return false;
        }

        statusWriter.markProcessing(jobId);

        try {
            byte[] content = switch (job.getExportType()) {
                case LEARNING_REPORT -> buildLearningReport();
                case REVENUE_REPORT -> buildRevenueReport();
                case ATTEMPT_DETAIL -> buildAttemptDetail();
                case USER_LIST -> buildUserList();
            };

            String assetId = storeReport(job, content);
            statusWriter.markCompleted(jobId, assetId);

            log.info("Export {} ({}) xong: {} byte", jobId, job.getExportType(), content.length);
            return true;

        } catch (Exception ex) {
            statusWriter.markFailed(jobId, ex.getMessage());
            log.error("Export {} thất bại: {}", jobId, ex.getMessage());
            return false;
        }
    }

    // -----------------------------------------------------------------
    // Các loại báo cáo
    // -----------------------------------------------------------------

    /**
     * Tiến độ học tập theo học viên: số lượt làm, điểm trung bình, thời gian học.
     */
    private byte[] buildLearningReport() {
        List<Object[]> rows = jdbc.query("""
                SELECT u.email,
                       COALESCE(p.full_name, '')            AS full_name,
                       COUNT(DISTINCT ta.id)                AS attempts,
                       COALESCE(ROUND(AVG(ta.percentage_score), 1), 0) AS avg_score,
                       COALESCE(SUM(ta.time_spent_seconds), 0)         AS study_seconds,
                       COALESCE(SUM(ta.correct_items), 0)   AS correct_items,
                       COALESCE(SUM(ta.total_items), 0)     AS total_items,
                       MAX(ta.completed_at)                 AS last_activity
                FROM users u
                LEFT JOIN user_profiles p ON p.user_id = u.id
                LEFT JOIN test_attempts ta
                       ON ta.user_id = u.id AND ta.status = 'COMPLETED'
                WHERE u.deleted_at IS NULL
                GROUP BY u.id, u.email, p.full_name
                ORDER BY attempts DESC
                """,
                (rs, rowNum) -> new Object[] {
                        rs.getString("email"),
                        rs.getString("full_name"),
                        rs.getInt("attempts"),
                        rs.getBigDecimal("avg_score"),
                        rs.getLong("study_seconds") / 60,
                        rs.getInt("correct_items"),
                        rs.getInt("total_items"),
                        rs.getTimestamp("last_activity") == null
                                ? "" : TIMESTAMP.format(rs.getTimestamp("last_activity").toInstant()),
                });

        return toWorkbook("Tien do hoc tap",
                List.of("Email", "Ho ten", "So luot lam", "Diem TB (%)",
                        "Thoi gian hoc (phut)", "Cau dung", "Tong cau", "Hoat dong gan nhat"),
                rows);
    }

    /**
     * Doanh thu theo gói: số đơn đã trả, tổng tiền, tiền giảm giá.
     */
    private byte[] buildRevenueReport() {
        List<Object[]> rows = jdbc.query("""
                SELECT sp.code                              AS plan_code,
                       sp.name                              AS plan_name,
                       COUNT(o.id)                          AS paid_orders,
                       COALESCE(SUM(o.subtotal_amount), 0)  AS gross_amount,
                       COALESCE(SUM(o.discount_amount), 0)  AS discount_amount,
                       COALESCE(SUM(o.total_amount), 0)     AS net_amount
                FROM subscription_plans sp
                LEFT JOIN order_items oi ON oi.item_id = sp.id
                LEFT JOIN orders o
                       ON o.id = oi.order_id
                      AND o.status IN ('PAID', 'PARTIALLY_REFUNDED')
                GROUP BY sp.id, sp.code, sp.name
                ORDER BY net_amount DESC
                """,
                (rs, rowNum) -> new Object[] {
                        rs.getString("plan_code"),
                        rs.getString("plan_name"),
                        rs.getInt("paid_orders"),
                        rs.getLong("gross_amount"),
                        rs.getLong("discount_amount"),
                        rs.getLong("net_amount"),
                });

        return toWorkbook("Doanh thu",
                List.of("Ma goi", "Ten goi", "So don da tra",
                        "Doanh thu goc (VND)", "Giam gia (VND)", "Thuc thu (VND)"),
                rows);
    }

    /**
     * Chi tiết từng lượt làm bài — dùng để phân tích sâu hoặc đối soát.
     */
    private byte[] buildAttemptDetail() {
        List<Object[]> rows = jdbc.query("""
                SELECT u.email,
                       ta.mode,
                       ta.status,
                       COALESCE(c.code, '')                 AS component_code,
                       COALESCE(p.name, '')                 AS part_name,
                       COALESCE(ta.raw_score, 0)            AS raw_score,
                       COALESCE(ta.max_score, 0)            AS max_score,
                       COALESCE(ta.percentage_score, 0)     AS percentage_score,
                       COALESCE(ta.cefr_level, '')          AS cefr_level,
                       ta.time_spent_seconds,
                       ta.created_at
                FROM test_attempts ta
                JOIN users u ON u.id = ta.user_id
                LEFT JOIN components c ON c.id = ta.component_id
                LEFT JOIN parts p ON p.id = ta.part_id
                ORDER BY ta.created_at DESC
                LIMIT 10000
                """,
                (rs, rowNum) -> new Object[] {
                        rs.getString("email"),
                        rs.getString("mode"),
                        rs.getString("status"),
                        rs.getString("component_code"),
                        rs.getString("part_name"),
                        rs.getBigDecimal("raw_score"),
                        rs.getBigDecimal("max_score"),
                        rs.getBigDecimal("percentage_score"),
                        rs.getString("cefr_level"),
                        rs.getInt("time_spent_seconds"),
                        TIMESTAMP.format(rs.getTimestamp("created_at").toInstant()),
                });

        return toWorkbook("Chi tiet luot lam bai",
                List.of("Email", "Che do", "Trang thai", "Hoc phan", "Part",
                        "Diem", "Diem toi da", "Phan tram", "CEFR",
                        "Thoi gian (giay)", "Tao luc"),
                rows);
    }

    /**
     * Danh sách học viên kèm trạng thái Premium.
     */
    private byte[] buildUserList() {
        List<Object[]> rows = jdbc.query("""
                SELECT u.email,
                       COALESCE(p.full_name, '')  AS full_name,
                       u.status,
                       CASE WHEN EXISTS (
                            SELECT 1 FROM user_entitlements e
                            WHERE e.user_id = u.id
                              AND e.entitlement_code = 'PREMIUM_CONTENT_ACCESS'
                              AND e.revoked_at IS NULL
                              AND e.starts_at <= UTC_TIMESTAMP()
                              AND (e.ends_at IS NULL OR e.ends_at > UTC_TIMESTAMP())
                       ) THEN 'CO' ELSE 'KHONG' END AS premium,
                       u.created_at,
                       u.last_login_at
                FROM users u
                LEFT JOIN user_profiles p ON p.user_id = u.id
                WHERE u.deleted_at IS NULL
                ORDER BY u.created_at DESC
                """,
                (rs, rowNum) -> new Object[] {
                        rs.getString("email"),
                        rs.getString("full_name"),
                        rs.getString("status"),
                        rs.getString("premium"),
                        TIMESTAMP.format(rs.getTimestamp("created_at").toInstant()),
                        rs.getTimestamp("last_login_at") == null
                                ? "" : TIMESTAMP.format(rs.getTimestamp("last_login_at").toInstant()),
                });

        return toWorkbook("Danh sach hoc vien",
                List.of("Email", "Ho ten", "Trang thai", "Premium",
                        "Ngay tao", "Dang nhap gan nhat"),
                rows);
    }

    // -----------------------------------------------------------------

    private byte[] toWorkbook(String sheetName, List<String> headers, List<Object[]> rows) {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet(sheetName);

            Row header = sheet.createRow(0);
            for (int index = 0; index < headers.size(); index++) {
                header.createCell(index).setCellValue(headers.get(index));
            }

            for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
                Row row = sheet.createRow(rowIndex + 1);
                Object[] values = rows.get(rowIndex);

                for (int col = 0; col < values.length; col++) {
                    writeCell(row, col, values[col]);
                }
            }

            for (int index = 0; index < headers.size(); index++) {
                sheet.autoSizeColumn(index);
            }

            workbook.write(output);
            return output.toByteArray();

        } catch (Exception ex) {
            throw new IllegalStateException("Không tạo được file Excel: " + ex.getMessage(), ex);
        }
    }

    private static void writeCell(Row row, int column, Object value) {
        var cell = row.createCell(column);
        if (value == null) {
            cell.setCellValue("");
        } else if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
        } else {
            cell.setCellValue(value.toString());
        }
    }

    private String storeReport(ExportJob job, byte[] content) {
        String bucket = properties.minio().buckets().exports();
        String assetId = UUID.randomUUID().toString();
        String objectKey = "exports/%s/%s/%s.xlsx"
                .formatted(job.getRequestedBy(), job.getId(), assetId);

        storageClient.upload(bucket, objectKey, content, XLSX_MIME);

        Asset asset = new Asset();
        asset.setId(assetId);
        asset.setBucketName(bucket);
        asset.setObjectKey(objectKey);
        asset.setAssetType(AssetType.EXPORT_FILE);
        asset.setMimeType(XLSX_MIME);
        asset.setOriginalFilename(job.getExportType().name().toLowerCase() + ".xlsx");
        asset.setFileSize((long) content.length);
        asset.setStatus(AssetStatus.READY);
        asset.setOwnerUserId(job.getRequestedBy());
        asset.setCreatedBy(job.getRequestedBy());

        return statusWriter.saveAsset(asset).getId();
    }
}
