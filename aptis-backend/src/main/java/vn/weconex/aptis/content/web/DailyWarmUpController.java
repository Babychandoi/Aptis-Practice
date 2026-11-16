package vn.weconex.aptis.content.web;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.content.service.DailyWarmUpService;

/** Bài khởi động hằng ngày hiện khi học viên vào trang chủ. */
@RestController
@RequestMapping("/api/v1/daily-warm-up")
@RequiredArgsConstructor
public class DailyWarmUpController {

    private final DailyWarmUpService service;
    private final CurrentUser currentUser;

    @GetMapping
    public DailyWarmUpDtos.WarmUpResponse today() {
        currentUser.requireUserId();
        return service.today();
    }
}
