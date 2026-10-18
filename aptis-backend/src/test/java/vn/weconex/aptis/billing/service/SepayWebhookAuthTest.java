package vn.weconex.aptis.billing.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SepayWebhookAuthTest {
    private static final String SECRET = "test-only-secret-not-production-123456789";
    private final SepayWebhookAuth auth = new SepayWebhookAuth();
    private final SepaySettingsService.Settings hmac = new SepaySettingsService.Settings(true,"bank","HMAC","encrypted","6789");
    static Map<String,String> sign(byte[] bytes,String secret,long timestamp) throws Exception {
        Mac mac=Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
        mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
        return Map.of("x-sepay-timestamp",String.valueOf(timestamp),"x-sepay-signature","sha256=" + HexFormat.of().formatHex(mac.doFinal(bytes)));
    }
    @Test void authenticatesOriginalBytesAndRejectsTamperingAndReplay() throws Exception {
        byte[] raw="{\"content\":\"thanh toán AP12345678\",\"id\":1}".getBytes(StandardCharsets.UTF_8);
        var headers=sign(raw,SECRET,Instant.now().getEpochSecond());
        assertThatCode(()->auth.verify(hmac,SECRET,raw,headers)).doesNotThrowAnyException();
        assertThatThrownBy(()->auth.verify(hmac,SECRET,"{\"id\":1}".getBytes(StandardCharsets.UTF_8),headers)).hasMessageContaining("không hợp lệ");
        var old=sign(raw,SECRET,Instant.now().minusSeconds(600).getEpochSecond());
        assertThatThrownBy(()->auth.verify(hmac,SECRET,raw,old)).hasMessageContaining("không hợp lệ");
        assertThatThrownBy(()->auth.verify(hmac,SECRET,raw,Map.of())).hasMessageContaining("không hợp lệ");
    }
    @Test void apiKeyRequiresCorrectSchemeAndSecret() {
        var cfg=new SepaySettingsService.Settings(true,"bank","API_KEY","encrypted","6789");
        byte[] raw=new byte[0];
        assertThatCode(()->auth.verify(cfg,SECRET,raw,Map.of("authorization","Apikey " + SECRET))).doesNotThrowAnyException();
        assertThatThrownBy(()->auth.verify(cfg,SECRET,raw,Map.of("authorization","Bearer " + SECRET))).hasMessageContaining("không hợp lệ");
    }
    @Test void transferCodeMustBeUnambiguousAndMatchContent() {
        assertThat(SepayWebhookService.extractCode("thanh toan AP12345678","AP12345678")).isEqualTo("AP12345678");
        assertThat(SepayWebhookService.extractCode("noi dung 12345678 chuyen tien",null)).isEqualTo("12345678");
        assertThat(SepayWebhookService.extractCode("AP123456789","AP12345678")).isNull();
        assertThat(SepayWebhookService.extractCode("AP12345678 AP87654321",null)).isNull();
        assertThat(SepayWebhookService.extractCode("AP12345678","AP87654321")).isNull();
    }
}
