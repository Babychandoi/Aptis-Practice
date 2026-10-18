package vn.weconex.aptis.billing.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.weconex.aptis.billing.service.SepaySettingsService;
import vn.weconex.aptis.billing.service.SepayWebhookService;
import vn.weconex.aptis.common.security.CurrentUser;

@RestController
@RequiredArgsConstructor
public class SepayController {
    private final SepaySettingsService settings;
    private final SepayWebhookService webhook;
    private final JdbcTemplate jdbc;
    private final CurrentUser currentUser;
    public record SaveSettings(boolean enabled, String bankAccountId, @NotBlank String authMode, @Size(max=256) String secret) {}

    @GetMapping("/api/v1/admin/sepay/settings")
    @PreAuthorize("hasAuthority('plan:write')")
    public SepaySettingsService.Status settings() { return settings.status(); }

    @PutMapping("/api/v1/admin/sepay/settings")
    @PreAuthorize("hasAuthority('plan:write')")
    public SepaySettingsService.Status save(@Valid @RequestBody SaveSettings body) {
        return settings.update(currentUser.requireUserId(), body.enabled(), body.bankAccountId(), body.authMode(), body.secret());
    }

    @GetMapping("/api/v1/admin/sepay/transactions")
    @PreAuthorize("hasAuthority('order:read')")
    public List<Map<String,Object>> transactions() {
        return jdbc.queryForList("""
                SELECT event_id AS eventId,reference_code AS referenceCode,amount,transfer_code AS transferCode,
                    order_id AS orderId,status,reason,transaction_at AS transactionAt,received_at AS receivedAt
                FROM sepay_transactions ORDER BY received_at DESC,event_id DESC LIMIT 50
                """);
    }

    @PostMapping(value="/api/v1/payments/webhooks/sepay",consumes="application/json")
    public Map<String,Boolean> receive(@RequestBody byte[] raw, HttpServletRequest request) {
        Map<String,String> headers = Collections.list(request.getHeaderNames()).stream().collect(Collectors.toMap(
                name -> name.toLowerCase(Locale.ROOT),request::getHeader,(first,second)->first));
        webhook.receive(raw,headers);
        return Map.of("success",true);
    }
}
