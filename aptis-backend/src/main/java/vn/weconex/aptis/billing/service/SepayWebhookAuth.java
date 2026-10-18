package vn.weconex.aptis.billing.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

@Component
public class SepayWebhookAuth {
    public void verify(SepaySettingsService.Settings settings, String secret, byte[] raw, Map<String,String> headers) {
        boolean valid = false;
        if ("API_KEY".equals(settings.authMode())) {
            String supplied = headers.getOrDefault("authorization", "");
            valid = MessageDigest.isEqual(("Apikey " + secret).getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8));
        } else if ("HMAC".equals(settings.authMode())) {
            String timestamp = headers.getOrDefault("x-sepay-timestamp", "");
            String signature = headers.getOrDefault("x-sepay-signature", "");
            try {
                long seconds = Long.parseLong(timestamp), now = Instant.now().getEpochSecond();
                if (timestamp.matches("[0-9]{1,12}") && seconds >= now - 300 && seconds <= now + 300) {
                    Mac mac = Mac.getInstance("HmacSHA256");
                    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                    mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
                    String expected = "sha256=" + HexFormat.of().formatHex(mac.doFinal(raw));
                    valid = MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8));
                }
            } catch (Exception ignored) { valid = false; }
        }
        if (!valid) throw new ApiException(ErrorCode.WEBHOOK_SIGNATURE_INVALID, "Xác thực webhook SePay không hợp lệ");
    }
}
