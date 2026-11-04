package vn.weconex.aptis.content.web;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.content.service.MonthlyFocusService;

/**
 * Đề trọng điểm tháng cho học viên: danh sách đề theo trang, URL audio/ảnh và
 * tiến độ từng câu. Quyền xem (Premium / làm thử) kiểm trong service.
 */
@RestController
@RequestMapping("/api/v1/monthly-focus")
@RequiredArgsConstructor
public class MonthlyFocusController {

    private final MonthlyFocusService service;
    private final CurrentUser currentUser;

    @GetMapping("/summary")
    public MonthlyFocusDtos.SummaryResponse summary() {
        currentUser.requireUserId();
        return service.summary();
    }

    @GetMapping("/pages/{pageKey}")
    public MonthlyFocusDtos.PageResponse page(
            @PathVariable String pageKey,
            @RequestParam(required = false) String topic) {
        return service.page(currentUser.requireUserId(), pageKey, topic);
    }

    @GetMapping("/writing")
    public MonthlyFocusDtos.WritingOverviewResponse writing() {
        currentUser.requireUserId();
        return service.writingOverview();
    }

    @GetMapping("/pages/{pageKey}/sets/{questionSetId}/assets")
    public MonthlyFocusDtos.AssetUrlsResponse assets(
            @PathVariable String pageKey, @PathVariable String questionSetId) {
        return service.assetUrls(currentUser.requireUserId(), pageKey, questionSetId);
    }

    @GetMapping("/pages/{pageKey}/progress")
    public List<MonthlyFocusDtos.ProgressEntry> progress(@PathVariable String pageKey) {
        return service.progress(currentUser.requireUserId(), pageKey);
    }

    @PostMapping("/pages/{pageKey}/progress")
    public MonthlyFocusDtos.ProgressEntry record(
            @PathVariable String pageKey,
            @Valid @RequestBody MonthlyFocusDtos.RecordProgressRequest request) {
        return service.record(currentUser.requireUserId(), pageKey, request);
    }

    @DeleteMapping("/pages/{pageKey}/progress")
    public ResponseEntity<Void> clear(@PathVariable String pageKey) {
        service.clear(currentUser.requireUserId(), pageKey);
        return ResponseEntity.noContent().build();
    }
}
