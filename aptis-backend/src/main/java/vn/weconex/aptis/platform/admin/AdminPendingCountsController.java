package vn.weconex.aptis.platform.admin;

import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Số việc đang chờ xử lý, cho badge trên sidebar quản trị (mock 09/2026).
 *
 * <p>Gộp một lần gọi thay vì mỗi mục một API: sidebar hiện trên mọi trang quản
 * trị, gọi năm API mỗi lần chuyển trang là phí. Mục nào người xem không có
 * quyền thì không đếm — không để lộ số liệu của khu họ không được vào.
 */
@RestController
@RequestMapping("/api/v1/admin/pending-counts")
@RequiredArgsConstructor
public class AdminPendingCountsController {

    private final EntityManager entityManager;

    /** Khoá badge → [quyền cần có, câu đếm]. */
    private static final Map<String, String[]> COUNTERS = new LinkedHashMap<>();

    static {
        COUNTERS.put("questionSets", new String[] {"question_set:review",
                "SELECT COUNT(*) FROM question_sets WHERE status = 'IN_REVIEW'"});
        COUNTERS.put("contributions", new String[] {"question_set:review",
                "SELECT COUNT(*) FROM question_set_contributions WHERE status = 'PENDING'"});
        COUNTERS.put("newsComments", new String[] {"news:moderate",
                "SELECT COUNT(*) FROM news_comments WHERE status = 'PENDING'"});
        COUNTERS.put("bankTransfers", new String[] {"order:read",
                "SELECT COUNT(*) FROM bank_transfer_requests WHERE status = 'CLAIMED'"});
        COUNTERS.put("refunds", new String[] {"refund:write",
                "SELECT COUNT(*) FROM refunds WHERE status IN ('REQUESTED', 'PROCESSING')"});
        COUNTERS.put("payouts", new String[] {"affiliate:read",
                "SELECT COUNT(*) FROM affiliate_payouts WHERE status = 'REQUESTED'"});
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Long> counts(Authentication authentication) {
        var granted = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
        Map<String, Long> result = new LinkedHashMap<>();
        COUNTERS.forEach((key, def) -> {
            if (granted.contains(def[0])) {
                Number n = (Number) entityManager.createNativeQuery(def[1]).getSingleResult();
                result.put(key, n.longValue());
            }
        });
        return result;
    }
}
