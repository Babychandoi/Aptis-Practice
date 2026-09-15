package vn.weconex.aptis.platform.analytics;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** DTO cho thống kê lượt xem trang. */
public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    /** Client gửi lên khi người dùng mở hoặc rời một trang. */
    public record TrackPageViewRequest(
            @NotBlank @Size(max = 64) String pageKey,
            @NotBlank @Size(max = 500) String path,
            @Size(max = 64) String referrerKey,
            @Size(max = 36) String sessionId,
            Integer durationMs) {
    }

    /** Một dòng trong bảng xếp hạng trang. */
    public record PageRankResponse(
            String pageKey,
            String label,
            long views,
            long uniqueUsers,
            /** Giây ở lại trung bình; 0 khi chưa có số liệu. */
            long avgSeconds) {
    }

    public record DailyPointResponse(String date, long views, long uniqueUsers) {
    }

    /** Một người đã xem trang đang xét. */
    public record PageViewerResponse(
            String userId,
            String email,
            String fullName,
            long views,
            Instant lastViewedAt,
            /** Đã mua gói bao giờ chưa — để biết ai xem mà chưa chuyển đổi. */
            boolean hasPaid,
            boolean premiumActive) {
    }

    public record EntryPointResponse(String pageKey, String label, long views) {
    }

    /** Tổng quan cho trang thống kê. */
    public record AnalyticsOverviewResponse(
            int days,
            long totalViews,
            long uniqueVisitors,
            List<PageRankResponse> pages) {
    }

    /**
     * Phễu chuyển đổi của trang nâng cấp gói.
     *
     * <p>Câu hỏi anh cần trả lời: bao nhiêu người ghé trang giá mà không mua.
     */
    public record ConversionFunnelResponse(
            int days,
            long viewedPlans,
            long viewedCheckout,
            long placedOrder,
            long paidOrder,
            /** Người xem trang giá nhưng chưa từng mua. */
            List<PageViewerResponse> viewedButNotPaid) {
    }

    /** Chi tiết một trang. */
    public record PageDetailResponse(
            String pageKey,
            String label,
            long views,
            long uniqueUsers,
            List<DailyPointResponse> daily,
            List<EntryPointResponse> entryPoints,
            List<PageViewerResponse> topViewers) {
    }
}
