package vn.weconex.aptis.common.util;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Chuẩn hóa thời điểm trước khi ghi vào cột DATETIME.
 */
public final class Timestamps {

    private Timestamps() {
    }

    /**
     * Cắt xuống giây.
     *
     * <p>Cột DATETIME không khai báo phần thập phân nên MySQL **làm tròn** giá
     * trị có mili giây. Với .500 trở lên, thời điểm bị đẩy lên giây kế tiếp và
     * nằm ở tương lai — mọi điều kiện dạng {@code starts_at <= NOW()} sẽ trượt
     * ngay sau khi ghi. Cắt (chứ không làm tròn) khiến quyền có hiệu lực ngay.
     *
     * <p>Chỉ áp dụng cho mốc BẮT ĐẦU. Mốc kết thúc không cần: làm tròn lên chỉ
     * kéo dài thêm dưới một giây, không gây lỗi nghiệp vụ.
     */
    public static Instant floorToSecond(Instant instant) {
        return instant == null ? null : instant.truncatedTo(ChronoUnit.SECONDS);
    }

    /** Thời điểm hiện tại đã cắt xuống giây. */
    public static Instant nowFloored() {
        return Instant.now().truncatedTo(ChronoUnit.SECONDS);
    }
}
