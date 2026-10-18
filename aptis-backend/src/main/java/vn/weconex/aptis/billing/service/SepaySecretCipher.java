package vn.weconex.aptis.billing.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.config.AptisProperties;

@Component
public class SepaySecretCipher {
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();
    public SepaySecretCipher(AptisProperties properties) {
        try {
            key = new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(
                    ("aptis:sepay-webhook:" + properties.jwt().secret()).getBytes(StandardCharsets.UTF_8)), "AES");
        } catch (Exception ex) { throw new IllegalStateException("Không khởi tạo được mã hóa SePay", ex); }
    }
    public String encrypt(String value) {
        try {
            byte[] iv = new byte[12]; random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(1 + iv.length + encrypted.length)
                    .put((byte)1).put(iv).put(encrypted).array());
        } catch (Exception ex) { throw new IllegalStateException("Không mã hóa được khóa SePay", ex); }
    }
    public String decrypt(String value) {
        try {
            ByteBuffer buffer = ByteBuffer.wrap(Base64.getDecoder().decode(value));
            if (buffer.get() != 1) throw new IllegalArgumentException("Phiên bản khóa không hợp lệ");
            byte[] iv = new byte[12]; buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()]; buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ex) { throw new IllegalStateException("Không giải mã được khóa SePay", ex); }
    }
}
