package vn.weconex.aptis.auth.service;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.entitlement.service.TrialIpFingerprint;

/** Purpose-separated HMACs; no raw browser IDs or enumerable IP hashes in DB. */
@Component
public class AbuseIdentityHasher {
    private final byte[] key;
    public AbuseIdentityHasher(AptisProperties properties, @Value("${aptis.abuse.hash-secret:}") String secret) {
        String configured=secret==null||secret.isBlank()?properties.jwt().secret():secret;
        key=configured.getBytes(StandardCharsets.UTF_8);
        if(key.length<32)throw new IllegalArgumentException("Anti-abuse signing key must be at least 32 bytes");
    }
    public String signCookie(String nonce){return hmac("cookie:v1:"+nonce);}
    public String browserHash(String nonce){return hmac("browser:v1:"+nonce);}
    public Optional<String> ipHash(String ip){return TrialIpFingerprint.of(ip).map(hash->hmac("ip:v1:"+hash));}
    private String hmac(String value){
        try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(key,"HmacSHA256"));return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));}
        catch(java.security.GeneralSecurityException ex){throw new IllegalStateException(ex);}
    }
}
