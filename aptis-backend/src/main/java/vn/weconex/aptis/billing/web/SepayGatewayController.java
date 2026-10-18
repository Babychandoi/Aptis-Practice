package vn.weconex.aptis.billing.web;

import java.util.Map;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.weconex.aptis.billing.service.SepayGatewayClient;
import vn.weconex.aptis.billing.service.SepayGatewayService;
import vn.weconex.aptis.common.security.CurrentUser;

@RestController
@RequiredArgsConstructor
public class SepayGatewayController {
    private final SepayGatewayService service;
    private final CurrentUser currentUser;
    private final JdbcTemplate jdbc;
    @GetMapping("/api/v1/orders/{orderId}/payment-method")
    public SepayGatewayService.Method method(@PathVariable String orderId) {return service.method(currentUser.requireUserId(),orderId);}
    @PostMapping("/api/v1/orders/{orderId}/sepay-checkout")
    public SepayGatewayService.Checkout create(@PathVariable String orderId) {return service.create(currentUser.requireUserId(),orderId);}
    @GetMapping("/api/v1/admin/sepay/gateway")
    @PreAuthorize("hasAuthority('plan:write')")
    public SepayGatewayService.Status status() {return service.status();}
    @GetMapping("/api/v1/admin/sepay/gateway/events")
    @PreAuthorize("hasAuthority('plan:write')")
    public List<Map<String,Object>> events() {
        return jdbc.queryForList("SELECT invoice,transaction_id AS transactionId,amount,status,reason,received_at AS receivedAt FROM sepay_gateway_events ORDER BY received_at DESC LIMIT 30");
    }
    @PostMapping(value=SepayGatewayClient.IPN_PATH,consumes="application/json")
    public Map<String,Boolean> ipn(@RequestBody byte[] raw,@RequestHeader(value="X-Secret-Key",required=false) String secret) {
        service.receive(raw,secret);return Map.of("success",true);
    }
}
