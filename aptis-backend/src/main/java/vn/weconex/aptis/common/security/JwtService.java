package vn.weconex.aptis.common.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Phát và xác thực access token. Refresh token KHÔNG phải JWT —
 * nó là random opaque string, lưu hash trong bảng refresh_tokens.
 */
@Service
public class JwtService {

    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_PERMISSIONS = "perms";

    private final SecretKey key;
    private final String issuer;
    private final java.time.Duration accessTtl;

    public JwtService(AptisProperties properties) {
        AptisProperties.Jwt jwt = properties.jwt();
        this.key = Keys.hmacShaKeyFor(decodeSecret(jwt.secret()));
        this.issuer = jwt.issuer();
        this.accessTtl = jwt.accessTokenTtl();
    }

    /**
     * Secret có thể là Base64 hoặc plain text. HMAC-SHA256 cần tối thiểu 32 byte.
     */
    private static byte[] decodeSecret(String secret) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ignored) {
            bytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "aptis.jwt.secret phải dài tối thiểu 256 bit (32 byte) sau khi decode");
        }
        return bytes;
    }

    public IssuedToken issueAccessToken(String userId, Set<String> roles, Set<String> permissions) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(accessTtl);

        String token = Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(issuer)
                .subject(userId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim(CLAIM_ROLES, List.copyOf(roles))
                .claim(CLAIM_PERMISSIONS, List.copyOf(permissions))
                .signWith(key)
                .compact();

        return new IssuedToken(token, expiresAt, accessTtl.toSeconds());
    }

    public ParsedToken parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return new ParsedToken(
                    claims.getSubject(),
                    Set.copyOf(claims.get(CLAIM_ROLES, List.class)),
                    Set.copyOf(claims.get(CLAIM_PERMISSIONS, List.class)));

        } catch (io.jsonwebtoken.ExpiredJwtException ex) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "Access token đã hết hạn");
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "Access token không hợp lệ");
        }
    }

    public record IssuedToken(String token, Instant expiresAt, long expiresInSeconds) {
    }

    public record ParsedToken(String userId, Set<String> roles, Set<String> permissions) {
    }
}
