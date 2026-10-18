package vn.weconex.aptis.billing.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** Ordered form signature, compatible with SePay's official checkout SDK. */
public final class SepayCheckoutSignature {
    private SepayCheckoutSignature() {}
    public static String sign(Map<String,String> fields,String secret) {
        try {
            String signed=fields.entrySet().stream().map(entry->entry.getKey()+"="+entry.getValue()).collect(Collectors.joining(","));
            Mac mac=Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(signed.getBytes(StandardCharsets.UTF_8)));
        } catch(Exception ex) {throw new IllegalStateException("Không ký được form thanh toán SePay",ex);}
    }
}
