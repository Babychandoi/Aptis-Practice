package vn.weconex.aptis.content.web;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.content.domain.ContentUpdateLog;
import vn.weconex.aptis.content.repository.ContentUpdateLogRepository;
import vn.weconex.aptis.entitlement.service.EntitlementService;

/**
 * Nhật ký cập nhật nội dung cho học viên.
 *
 * <p>Yêu cầu Premium: mục đích của trang là dẫn vào các đề mới, mà đề mới đều
 * PREMIUM. Cho tài khoản miễn phí xem danh sách rồi chặn ở bước bấm vào thì
 * đúng luật nhưng gây hiểu nhầm là hệ thống lỗi.
 */
@RestController
@RequestMapping("/api/v1/content-updates")
@RequiredArgsConstructor
public class ContentUpdateController {

    private final ContentUpdateLogRepository repository;
    private final EntitlementService entitlementService;
    private final CurrentUser currentUser;

    @GetMapping
    @Transactional(readOnly = true)
    public List<ContentUpdateDtos.UpdateLogResponse> list() {
        if (!entitlementService.hasPremiumAccess(currentUser.requireUserId())) {
            throw ApiException.premiumRequired();
        }

        List<ContentUpdateLog> logs = repository.findPublished();
        if (logs.isEmpty()) {
            return List.of();
        }

        // Một truy vấn cho cả trang thay vì một truy vấn mỗi mục.
        Map<String, List<ContentUpdateDtos.UpdateQuestionSetResponse>> byLog = new LinkedHashMap<>();
        for (Object[] row : repository.findQuestionSetsByLogIds(
                logs.stream().map(ContentUpdateLog::getId).toList())) {

            byLog.computeIfAbsent((String) row[0], key -> new ArrayList<>())
                    .add(new ContentUpdateDtos.UpdateQuestionSetResponse(
                            (String) row[1],
                            (String) row[2],
                            (String) row[3],
                            row[4] == null ? 0 : ((Number) row[4]).intValue()));
        }

        return logs.stream()
                .map(log -> new ContentUpdateDtos.UpdateLogResponse(
                        log.getId(),
                        log.getLogDate(),
                        log.getLabel(),
                        log.getDescription(),
                        log.getPartId(),
                        byLog.getOrDefault(log.getId(), List.of())))
                .toList();
    }
}
