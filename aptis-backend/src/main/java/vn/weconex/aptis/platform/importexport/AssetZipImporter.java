package vn.weconex.aptis.platform.importexport;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.common.config.AptisProperties;

/**
 * Nhập hàng loạt file audio/ảnh từ một file ZIP (API §50).
 *
 * <p>Soạn bài Listening cần hàng trăm file audio; tải lên từng file qua giao
 * diện quá chậm nên cho phép nén cả thư mục rồi nhập một lượt.
 *
 * <p>Mỗi file trong ZIP thành một Asset READY; biên tập viên tham chiếu tới
 * chúng bằng {@code originalFilename} khi soạn câu hỏi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetZipImporter {

    /**
     * Chỉ nhận định dạng dùng được trong đề thi. Danh sách trắng chứ không phải
     * danh sách đen: file lạ lọt vào storage rồi phục vụ lại cho trình duyệt là
     * đường tấn công.
     */
    private static final List<String> ALLOWED = List.of(
            "mp3", "m4a", "wav", "ogg", "png", "jpg", "jpeg", "webp", "gif");

    /** Giới hạn một file sau giải nén — chặn zip bomb. */
    private static final long MAX_ENTRY_BYTES = 50L * 1024 * 1024;

    /** Giới hạn tổng dung lượng sau giải nén của cả gói. */
    private static final long MAX_TOTAL_BYTES = 500L * 1024 * 1024;

    /** Giới hạn số file — tránh một gói tạo hàng vạn asset. */
    private static final int MAX_ENTRIES = 2_000;

    private final AssetWriter assetWriter;
    private final AptisProperties properties;

    public record ZipImportResult(int totalFiles, int successCount, List<String> errors) {
    }

    /**
     * Giải nén và đẩy từng file lên MinIO.
     *
     * <p>Không bọc transaction cho cả gói: file đã lên storage không rollback
     * được, nên mỗi asset ghi DB riêng và gói lỗi giữa chừng vẫn giữ phần đã vào.
     */
    public ZipImportResult importAll(String actorId, byte[] zipContent) {
        List<String> errors = new ArrayList<>();
        int total = 0;
        int success = 0;
        long totalBytes = 0;

        String bucket = properties.minio().buckets().content();

        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(zipContent))) {
            ZipEntry entry;

            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    continue;
                }

                total++;
                if (total > MAX_ENTRIES) {
                    errors.add("Gói có quá %d file, phần còn lại bị bỏ qua".formatted(MAX_ENTRIES));
                    break;
                }

                String rawName = entry.getName();
                String filename = safeFilename(rawName);

                if (filename == null) {
                    errors.add(rawName + ": tên file không hợp lệ");
                    continue;
                }
                if (filename.startsWith(".") || filename.startsWith("__MACOSX")) {
                    // File hệ thống do trình nén tạo ra, không phải nội dung
                    total--;
                    continue;
                }

                String extension = extensionOf(filename);
                if (!ALLOWED.contains(extension)) {
                    errors.add(filename + ": định dạng không được phép (chỉ nhận "
                            + String.join(", ", ALLOWED) + ")");
                    continue;
                }

                byte[] data;
                try {
                    data = readEntry(zip);
                } catch (IllegalStateException ex) {
                    errors.add(filename + ": " + ex.getMessage());
                    continue;
                }

                if (data.length == 0) {
                    errors.add(filename + ": file rỗng");
                    continue;
                }

                totalBytes += data.length;
                if (totalBytes > MAX_TOTAL_BYTES) {
                    errors.add("Tổng dung lượng sau giải nén vượt %d MB, dừng nhập"
                            .formatted(MAX_TOTAL_BYTES / 1024 / 1024));
                    break;
                }

                try {
                    // Qua bean khác để REQUIRES_NEW có hiệu lực
                    assetWriter.saveOne(actorId, bucket, filename, extension, data);
                    success++;
                } catch (Exception ex) {
                    errors.add(filename + ": " + ex.getMessage());
                }
            }

        } catch (Exception ex) {
            log.warn("Không đọc được file ZIP: {}", ex.getMessage());
            errors.add("Không đọc được file ZIP: " + ex.getMessage());
        }

        return new ZipImportResult(total, success, errors);
    }

    /**
     * Đọc một entry với trần dung lượng. Không tin {@code entry.getSize()} vì
     * đó là số ghi trong header ZIP, kẻ tấn công khai báo được tùy ý.
     */
    private static byte[] readEntry(ZipInputStream zip) throws java.io.IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        long written = 0;
        int read;

        while ((read = zip.read(chunk)) > 0) {
            written += read;
            if (written > MAX_ENTRY_BYTES) {
                throw new IllegalStateException(
                        "file vượt quá %d MB".formatted(MAX_ENTRY_BYTES / 1024 / 1024));
            }
            buffer.write(chunk, 0, read);
        }
        return buffer.toByteArray();
    }

    /**
     * Lấy phần tên file, bỏ đường dẫn thư mục trong ZIP.
     *
     * <p>Chặn zip slip: entry đặt tên {@code ../../etc/passwd} sẽ ghi ra ngoài
     * thư mục đích nếu ghép đường dẫn thẳng. Ở đây object key luôn sinh từ UUID
     * nên đã an toàn, nhưng vẫn lọc để tên hiển thị không chứa đường dẫn.
     */
    private static String safeFilename(String entryName) {
        if (entryName == null || entryName.isBlank()) {
            return null;
        }

        String normalized = entryName.replace('\\', '/');
        int lastSlash = normalized.lastIndexOf('/');
        String name = lastSlash < 0 ? normalized : normalized.substring(lastSlash + 1);

        if (name.isBlank() || name.equals(".") || name.equals("..")) {
            return null;
        }
        return name;
    }

    private static String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot < 0 ? "" : filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
