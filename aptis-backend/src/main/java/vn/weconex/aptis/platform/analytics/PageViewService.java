package vn.weconex.aptis.platform.analytics;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ghi nhận lượt xem trang.
 *
 * <p>Mục tiêu là trả lời được "học viên quan tâm gì nhất": trang nào hay vào,
 * bao nhiêu người ghé trang nâng cấp gói mà không mua, tính năng mới có ai để ý
 * không.
 *
 * <p>Chỉ nhận khóa trang trong danh sách trắng. Client là thứ gửi dữ liệu lên
 * nên không tin được: không lọc thì một request giả có thể bơm hàng nghìn khóa
 * rác làm báo cáo vô dụng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PageViewService {

    /** Số ngày giữ dữ liệu; cũ hơn thì xoá. */
    private static final int RETENTION_DAYS = 180;

    /** Chặn trên của thời gian ở lại, để tab mở cả đêm không làm lệch trung bình. */
    private static final int MAX_DURATION_MS = 30 * 60 * 1000;

    /**
     * Các trang được theo dõi.
     *
     * <p>Thêm khóa mới vào đây khi có trang mới cần đo. Giữ danh sách ngắn:
     * đếm mọi trang sẽ loãng, khó nhìn ra trang nào thật sự quan trọng.
     */
    private static final Set<String> ALLOWED_PAGES = Set.of(
            "dashboard",
            "plans",
            "checkout",
            "affiliate",
            "exam-prediction",
            "news-feed",
            "news-post",
            "study-tips",
            "content-update",
            "mock-tests",
            "skill-list",
            "component",
            "component-parts",
            "component-tests",
            "part",
            "attempt",
            "attempt-result",
            "history",
            "profile");

    private final PageViewRepository repository;

    /**
     * Ghi một lượt xem.
     *
     * <p>Chạy bất đồng bộ và nuốt mọi lỗi: đây là số liệu phụ trợ, hỏng thì
     * mất thống kê chứ tuyệt đối không được làm hỏng thao tác của học viên.
     */
    @Async
    @Transactional
    public void record(
            String userId,
            String pageKey,
            String path,
            String referrerKey,
            String sessionId,
            Integer durationMs,
            String ipAddress,
            String userAgent) {

        try {
            if (pageKey == null || !ALLOWED_PAGES.contains(pageKey)) {
                return;
            }

            PageView view = new PageView();
            view.setId(UUID.randomUUID().toString());
            view.setUserId(userId);
            view.setPageKey(pageKey);
            view.setPath(truncate(path, 500));
            view.setReferrerKey(
                    referrerKey != null && ALLOWED_PAGES.contains(referrerKey) ? referrerKey : null);
            view.setSessionId(sessionId);
            view.setDurationMs(clampDuration(durationMs));
            view.setIpAddress(truncate(ipAddress, 64));
            view.setUserAgent(truncate(userAgent, 500));
            repository.save(view);
        } catch (RuntimeException ex) {
            log.warn("Không ghi được lượt xem trang {}: {}", pageKey, ex.getMessage());
        }
    }

    /** Job dọn dữ liệu quá hạn giữ. */
    @Transactional
    public int purgeOld() {
        return repository.deleteOlderThan(
                Instant.now().minus(RETENTION_DAYS, ChronoUnit.DAYS));
    }

    /** Bỏ giá trị vô lý: âm, hoặc tab để mở hàng giờ. */
    private static Integer clampDuration(Integer durationMs) {
        if (durationMs == null || durationMs < 0) {
            return null;
        }
        return Math.min(durationMs, MAX_DURATION_MS);
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
