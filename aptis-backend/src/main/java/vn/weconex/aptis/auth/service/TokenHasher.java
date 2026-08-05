package vn.weconex.aptis.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.stereotype.Component;

/**
 * Sinh và hash token opaque (refresh token, token xác thực email, reset mật khẩu).
 *
 * <p>Dùng SHA-256 chứ không phải Argon2: token là random 256-bit nên không có
 * entropy thấp để brute-force, và luồng refresh cần tra cứu theo hash — hash
 * có salt sẽ không tra cứu được bằng index.
 */
@Component
public class TokenHasher {

    private static final int TOKEN_BYTES = 32;

    private final SecureRandom random = new SecureRandom();

    /**
     * @return token dạng base64url không padding, chỉ trả cho client một lần duy nhất
     */
    public String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 không khả dụng", ex);
        }
    }
}
