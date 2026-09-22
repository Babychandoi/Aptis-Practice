package vn.weconex.aptis.conversation.service;

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
public class GeminiKeyCipher {
    private static final byte VERSION = 1;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public GeminiKeyCipher(AptisProperties properties) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(
                    ("aptis:gemini-live:" + properties.jwt().secret()).getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(digest, "AES");
        } catch (Exception ex) {
            throw new IllegalStateException("Không khởi tạo được mã hóa Gemini key", ex);
        }
    }

    public String encrypt(String plain) {
        try {
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(1 + iv.length + encrypted.length)
                    .put(VERSION).put(iv).put(encrypted).array());
        } catch (Exception ex) {
            throw new IllegalStateException("Không mã hóa được Gemini key", ex);
        }
    }

    public String decrypt(String encoded) {
        try {
            ByteBuffer buffer = ByteBuffer.wrap(Base64.getDecoder().decode(encoded));
            if (buffer.get() != VERSION) throw new IllegalArgumentException("Phiên bản ciphertext không hỗ trợ");
            byte[] iv = new byte[12];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Không giải mã được Gemini key", ex);
        }
    }
}
