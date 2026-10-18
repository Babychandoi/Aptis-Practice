package vn.weconex.aptis.billing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/** Live credentials NEVER flow to Sandbox hosts. All URLs are fixed, not client supplied. */
@Component
public class SepayGatewayClient {
    public static final String CHECKOUT_URL="https://pay.sepay.vn/v1/checkout/init";
    public static final String IPN_PATH="/api/v1/payments/sepay/ipn";
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).followRedirects(HttpClient.Redirect.NEVER).build();
    private final ObjectMapper json;
    private final boolean enabled;
    private final String environment,merchant,secret,ipnSecret;
    public SepayGatewayClient(ObjectMapper json,@Value("${SEPAY_ENABLED:false}") boolean enabled,
            @Value("${SEPAY_ENV:production}") String environment,@Value("${SEPAY_MERCHANT_ID:}") String merchant,
            @Value("${SEPAY_SECRET_KEY:}") String secret,@Value("${SEPAY_IPN_SECRET:}") String ipnSecret) {
        this.json=json;this.enabled=enabled;this.environment=environment;this.merchant=merchant;this.secret=secret;
        this.ipnSecret=ipnSecret.isBlank()?secret:ipnSecret;
    }
    public boolean enabled() { return enabled; }
    public boolean configured() {
        return "production".equals(environment)&&!merchant.isBlank()&&!merchant.startsWith("SP-TEST-")
                && (secret.startsWith("spsk_live_")||secret.startsWith("spsk_prod_"))&&ipnSecret.length()>=32;
    }
    public String merchant() { return merchant; }
    public String environment() { return environment; }
    public String secret() { return secret; }
    public void requireConfigured() {
        if(!configured()) throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE,"Cổng thanh toán SePay production chưa sẵn sàng. Vui lòng liên hệ hỗ trợ.");
    }
    public void requireReady() {
        if(!enabled) throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE,"Cổng thanh toán SePay production đã tắt cho đơn mới.");
        requireConfigured();
    }
    public void authenticate(String supplied) {
        // Keep accepting IPNs for invoices issued before checkout was disabled.
        requireConfigured();
        if(supplied==null||!MessageDigest.isEqual(ipnSecret.getBytes(StandardCharsets.UTF_8),supplied.getBytes(StandardCharsets.UTF_8)))
            throw new ApiException(ErrorCode.WEBHOOK_SIGNATURE_INVALID,"Secret Key IPN SePay không hợp lệ");
    }
    public String merchantFingerprint() { return hash(merchant); }
    public static String hash(String input) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8))); }
        catch(Exception ex) { throw new IllegalStateException(ex); }
    }
    public JsonNode retrieve(String invoice) {
        // Existing invoice callbacks still need a live provider lookup after checkout is disabled.
        requireConfigured();
        if(!invoice.matches("APTISPG[A-F0-9]{32}")) throw new ApiException(ErrorCode.VALIDATION_FAILED,"Mã thanh toán SePay không hợp lệ");
        String auth=Base64.getEncoder().encodeToString((merchant+":"+secret).getBytes(StandardCharsets.UTF_8));
        var request=HttpRequest.newBuilder(URI.create("https://pgapi.sepay.vn/v1/order/detail/"+invoice))
                .header("Authorization","Basic "+auth).header("Accept","application/json").timeout(Duration.ofSeconds(8)).GET().build();
        try {
            var response=http.send(request,HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if(response.statusCode()!=200) throw provider("API SePay chưa xác nhận được đơn (HTTP "+response.statusCode()+")");
            var data=json.readTree(response.body()).path("data");
            if(!data.isObject()) throw provider("Dữ liệu xác nhận SePay không hợp lệ");
            return data;
        } catch(ApiException ex) { throw ex; }
        catch(InterruptedException ex) { Thread.currentThread().interrupt();throw provider("Tra cứu SePay bị gián đoạn; chưa cấp quyền và cần thử lại"); }
        catch(Exception ex) { throw provider("Không kết nối được API SePay; chưa cấp quyền và cần thử lại"); }
    }
    private ApiException provider(String message) { return new ApiException(ErrorCode.PAYMENT_PROVIDER_ERROR,message); }
}
