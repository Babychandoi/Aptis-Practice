package vn.weconex.aptis.content.web;

import java.time.LocalDate;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.content.service.ExamPredictionService;
import vn.weconex.aptis.entitlement.service.EntitlementService;

/**
 * Dự đoán đề cho học viên.
 *
 * <p>Yêu cầu Premium như trang nhật ký cập nhật: mục đích là dẫn vào đề luyện,
 * mà đề đều PREMIUM. Cho tài khoản miễn phí xem rồi chặn ở bước bấm thì đúng
 * luật nhưng gây hiểu nhầm là hệ thống lỗi.
 */
@RestController
@RequestMapping("/api/v1/exam-predictions")
@RequiredArgsConstructor
public class ExamPredictionController {

    /** Cửa sổ mặc định cho tab "đề hot nhất", tính theo tháng. */
    private static final int DEFAULT_HOT_MONTHS = 2;

    private final ExamPredictionService service;
    private final EntitlementService entitlementService;
    private final CurrentUser currentUser;

    /** Bản tin của một ngày; bỏ trống date thì lấy hôm nay. */
    @GetMapping
    public ExamPredictionDtos.PredictionFeedResponse today(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        requirePremium();
        return service.feedFor(date == null ? LocalDate.now() : date);
    }

    /** Chủ đề lặp nhiều nhất trong N tháng gần đây. */
    @GetMapping("/hottest")
    public ExamPredictionDtos.PredictionFeedResponse hottest(
            @RequestParam(required = false) Integer months) {

        requirePremium();
        int window = months == null || months < 1 ? DEFAULT_HOT_MONTHS : Math.min(months, 12);
        LocalDate to = LocalDate.now();
        return service.hottestBetween(to.minusMonths(window), to);
    }

    private void requirePremium() {
        if (!entitlementService.hasPremiumAccess(currentUser.requireUserId())) {
            throw ApiException.premiumRequired();
        }
    }
}
