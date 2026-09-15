package vn.weconex.aptis.platform.analytics;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.User;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.billing.repository.OrderRepository;
import vn.weconex.aptis.common.util.Enums.OrderStatus;
import vn.weconex.aptis.entitlement.domain.UserEntitlement;
import vn.weconex.aptis.entitlement.repository.UserEntitlementRepository;

/** Báo cáo hành vi học viên cho quản trị. */
@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    /** Số người tối đa liệt kê trong mỗi danh sách, đủ để chăm sóc thủ công. */
    private static final int VIEWER_LIMIT = 50;

    /** Tên tiếng Việt của từng trang, để báo cáo đọc được ngay. */
    private static final Map<String, String> PAGE_LABELS = Map.ofEntries(
            Map.entry("dashboard", "Trang chủ"),
            Map.entry("plans", "Nâng cấp gói"),
            Map.entry("checkout", "Thanh toán"),
            Map.entry("affiliate", "Giới thiệu bạn bè"),
            Map.entry("exam-prediction", "Dự đoán đề"),
            Map.entry("news-feed", "Bảng tin"),
            Map.entry("news-post", "Bài viết bảng tin"),
            Map.entry("study-tips", "Mẹo học"),
            Map.entry("content-update", "Cập nhật đề"),
            Map.entry("mock-tests", "Thi thử"),
            Map.entry("skill-list", "Danh sách kỹ năng"),
            Map.entry("component", "Trang kỹ năng"),
            Map.entry("component-parts", "Luyện theo Part"),
            Map.entry("component-tests", "Bài test kỹ năng"),
            Map.entry("part", "Luyện một Part"),
            Map.entry("attempt", "Đang làm bài"),
            Map.entry("attempt-result", "Kết quả bài làm"),
            Map.entry("history", "Lịch sử"),
            Map.entry("profile", "Hồ sơ"));

    private final PageViewRepository pageViewRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final OrderRepository orderRepository;
    private final UserEntitlementRepository entitlementRepository;

    /** Xếp hạng trang theo lượt xem — học viên quan tâm gì nhất. */
    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('analytics:read')")
    @Transactional(readOnly = true)
    public AnalyticsDtos.AnalyticsOverviewResponse overview(
            @RequestParam(defaultValue = "30") int days) {

        Instant from = since(days);
        List<AnalyticsDtos.PageRankResponse> pages = pageViewRepository.rankPages(from).stream()
                .map(row -> new AnalyticsDtos.PageRankResponse(
                        (String) row[0],
                        label((String) row[0]),
                        toLong(row[1]),
                        toLong(row[2]),
                        // AVG trả về mili-giây; đổi sang giây cho dễ đọc.
                        row[3] == null ? 0L : ((Number) row[3]).longValue() / 1000))
                .toList();

        return new AnalyticsDtos.AnalyticsOverviewResponse(
                days,
                pages.stream().mapToLong(AnalyticsDtos.PageRankResponse::views).sum(),
                pages.stream().mapToLong(AnalyticsDtos.PageRankResponse::uniqueUsers).max().orElse(0),
                pages);
    }

    /** Chi tiết một trang: xu hướng theo ngày, đến từ đâu, ai xem nhiều. */
    @GetMapping("/pages/{pageKey}")
    @PreAuthorize("hasAuthority('analytics:read')")
    @Transactional(readOnly = true)
    public AnalyticsDtos.PageDetailResponse pageDetail(
            @PathVariable String pageKey,
            @RequestParam(defaultValue = "30") int days) {

        Instant from = since(days);

        List<AnalyticsDtos.DailyPointResponse> daily = pageViewRepository
                .dailyTrend(pageKey, from).stream()
                .map(row -> new AnalyticsDtos.DailyPointResponse(
                        String.valueOf(row[0]), toLong(row[1]), toLong(row[2])))
                .toList();

        List<AnalyticsDtos.EntryPointResponse> entryPoints = pageViewRepository
                .entryPointsOf(pageKey, from).stream()
                .map(row -> new AnalyticsDtos.EntryPointResponse(
                        (String) row[0], label((String) row[0]), toLong(row[1])))
                .toList();

        List<Object[]> viewerRows = pageViewRepository.viewersOf(pageKey, from);
        List<AnalyticsDtos.PageViewerResponse> viewers =
                toViewers(viewerRows.stream().limit(VIEWER_LIMIT).toList());

        return new AnalyticsDtos.PageDetailResponse(
                pageKey,
                label(pageKey),
                daily.stream().mapToLong(AnalyticsDtos.DailyPointResponse::views).sum(),
                viewerRows.size(),
                daily,
                entryPoints,
                viewers);
    }

    /**
     * Phễu mua gói.
     *
     * <p>Trả lời trực tiếp "bao nhiêu người vào trang nâng cấp mà không mua", và
     * liệt kê cụ thể những người đó để còn chăm sóc.
     */
    @GetMapping("/conversion")
    @PreAuthorize("hasAuthority('analytics:read')")
    @Transactional(readOnly = true)
    public AnalyticsDtos.ConversionFunnelResponse conversion(
            @RequestParam(defaultValue = "30") int days) {

        Instant from = since(days);

        List<Object[]> planViewers = pageViewRepository.viewersOf("plans", from);

        // Ai đã từng mua thành công — tính cả trước khoảng đang xét, vì người
        // mua từ tháng trước rồi quay lại xem giá không phải là người "chưa
        // chuyển đổi".
        List<String> paidUserIds = orderRepository.findUserIdsWithStatus(OrderStatus.PAID);

        List<Object[]> notPaidRows = planViewers.stream()
                .filter(row -> !paidUserIds.contains((String) row[0]))
                .limit(VIEWER_LIMIT)
                .toList();

        return new AnalyticsDtos.ConversionFunnelResponse(
                days,
                pageViewRepository.countByPageKeyAndCreatedAtAfter("plans", from),
                pageViewRepository.countByPageKeyAndCreatedAtAfter("checkout", from),
                orderRepository.countCreatedSince(from),
                orderRepository.countPaidSince(from),
                toViewers(notPaidRows));
    }

    /** Một học viên quan tâm gì — trang họ hay xem. */
    @GetMapping("/users/{userId}")
    @PreAuthorize("hasAuthority('analytics:read')")
    @Transactional(readOnly = true)
    public List<AnalyticsDtos.PageRankResponse> userInterests(
            @PathVariable String userId,
            @RequestParam(defaultValue = "90") int days) {

        return pageViewRepository.pagesOfUser(userId, since(days)).stream()
                .map(row -> new AnalyticsDtos.PageRankResponse(
                        (String) row[0], label((String) row[0]), toLong(row[1]), 1L, 0L))
                .toList();
    }

    /**
     * Dựng danh sách người xem kèm thông tin tài khoản.
     *
     * <p>Gom user, hồ sơ và trạng thái mua theo lô: gọi lẻ từng người sẽ thành
     * N+1 với danh sách 50 dòng.
     */
    private List<AnalyticsDtos.PageViewerResponse> toViewers(List<Object[]> rows) {
        if (rows.isEmpty()) {
            return List.of();
        }

        List<String> userIds = rows.stream().map(row -> (String) row[0]).toList();

        Map<String, User> users = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        Map<String, String> names = profileRepository.findByUserIdIn(userIds).stream()
                .filter(profile -> profile.getFullName() != null && !profile.getFullName().isBlank())
                .collect(Collectors.toMap(UserProfile::getUserId, UserProfile::getFullName));

        List<String> paidUserIds = orderRepository.findUserIdsWithStatus(OrderStatus.PAID);
        List<String> premiumUserIds = entitlementRepository
                .findUserIdsWithNonTrialEntitlement(UserEntitlement.PREMIUM_CONTENT_ACCESS);

        List<AnalyticsDtos.PageViewerResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            String userId = (String) row[0];
            User user = users.get(userId);
            result.add(new AnalyticsDtos.PageViewerResponse(
                    userId,
                    user == null ? "" : user.getEmail(),
                    names.getOrDefault(userId, ""),
                    toLong(row[1]),
                    (Instant) row[2],
                    paidUserIds.contains(userId),
                    premiumUserIds.contains(userId)));
        }
        return result;
    }

    private static String label(String pageKey) {
        return PAGE_LABELS.getOrDefault(pageKey, pageKey);
    }

    /** Giới hạn 1-365 ngày: quá dài thì truy vấn nặng mà không thêm thông tin. */
    private static Instant since(int days) {
        int safe = Math.max(1, Math.min(365, days));
        return Instant.now().minus(safe, ChronoUnit.DAYS);
    }

    private static long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }
}
