package vn.weconex.aptis.platform.analytics;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;

/** Nhận lượt xem trang từ trình duyệt. */
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final PageViewService pageViewService;
    private final CurrentUser currentUser;

    /**
     * Ghi một lượt xem trang.
     *
     * <p>Luôn trả 204 kể cả khi bỏ qua bản ghi: client không cần biết và cũng
     * không nên thử lại — mất một lượt thống kê không đáng để làm phiền người
     * đang học.
     *
     * <p>Không bắt buộc đăng nhập: khách xem trang giá cũng là số liệu đáng giá.
     */
    @PostMapping("/page-views")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trackPageView(
            @Valid @RequestBody AnalyticsDtos.TrackPageViewRequest request,
            HttpServletRequest httpRequest) {

        pageViewService.record(
                currentUser.find().map(principal -> principal.userId()).orElse(null),
                request.pageKey(),
                request.path(),
                request.referrerKey(),
                request.sessionId(),
                request.durationMs(),
                clientIp(httpRequest),
                httpRequest.getHeader("User-Agent"));
    }

    /**
     * IP thật của client.
     *
     * <p>Chạy sau Cloudflare Tunnel nên {@code getRemoteAddr()} luôn là IP nội
     * bộ của proxy; IP thật nằm ở header.
     */
    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("CF-Connecting-IP");
        if (forwarded == null || forwarded.isBlank()) {
            forwarded = request.getHeader("X-Forwarded-For");
        }
        if (forwarded == null || forwarded.isBlank()) {
            return request.getRemoteAddr();
        }
        // X-Forwarded-For có thể là chuỗi "client, proxy1, proxy2".
        int comma = forwarded.indexOf(',');
        return comma < 0 ? forwarded.trim() : forwarded.substring(0, comma).trim();
    }
}
