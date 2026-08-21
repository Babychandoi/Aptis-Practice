package vn.weconex.aptis.auth.service;

import java.time.Duration;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Xác thực ID token của Google.
 *
 * <p>Dùng endpoint {@code tokeninfo} của Google thay vì tự kiểm chữ ký RS256:
 * thư viện JWT trong dự án (jjwt) cấu hình cho HMAC của token nội bộ, muốn kiểm
 * RS256 phải thêm code tải và cache khoá công khai của Google, tự xoay khoá khi
 * Google đổi. Endpoint này để Google tự làm việc đó.
 *
 * <p>Đánh đổi: mỗi lần đăng nhập tốn một lượt gọi HTTP ra ngoài (~200ms). Chấp
 * nhận được vì chỉ xảy ra lúc đăng nhập, không phải mỗi request.
 */
@Slf4j
@Component
public class GoogleTokenVerifier {

    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

    private final RestTemplate restTemplate;
    private final String expectedClientId;

    public GoogleTokenVerifier(
            @Value("${aptis.oauth.google.client-id:}") String expectedClientId) {

        // Timeout ngắn: đây là chặng nằm giữa người dùng và màn hình đăng nhập,
        // Google chậm thì báo lỗi còn hơn để họ chờ vô định.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(10).toMillis());
        this.restTemplate = new RestTemplate(factory);
        this.expectedClientId = expectedClientId == null ? "" : expectedClientId.strip();

        if (this.expectedClientId.isBlank()) {
            log.info("Chưa cấu hình GOOGLE_CLIENT_ID — đăng nhập bằng Google sẽ bị từ chối");
        }
    }

    public boolean isEnabled() {
        return !expectedClientId.isBlank();
    }

    /**
     * Client ID để trình duyệt khởi tạo nút Google. Trả chuỗi rỗng khi chưa cấu
     * hình — frontend dựa vào đó để ẩn nút thay vì hiện nút bấm vào là lỗi.
     */
    public String clientId() {
        return expectedClientId;
    }

    /** Thông tin đã xác thực, chỉ chứa những gì hệ thống cần. */
    public record GoogleUser(String subject, String email, String name) {
    }

    /**
     * Trả về thông tin người dùng nếu token hợp lệ, ném {@link ApiException} nếu
     * không.
     */
    public GoogleUser verify(String idToken) {
        if (!isEnabled()) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Đăng nhập bằng Google chưa được cấu hình trên hệ thống");
        }

        Map<String, Object> claims = fetchClaims(idToken);

        // aud phải khớp client id của mình. Không kiểm bước này thì token do
        // ứng dụng KHÁC của Google phát cũng đăng nhập được vào đây — đó là lỗ
        // hổng chiếm tài khoản, không phải chi tiết nhỏ.
        String audience = asString(claims.get("aud"));
        if (!expectedClientId.equals(audience)) {
            log.warn("Token Google có aud={} không khớp client id cấu hình", audience);
            throw new ApiException(ErrorCode.TOKEN_INVALID, "Token Google không dành cho ứng dụng này");
        }

        // Google chỉ phát token cho hai issuer này.
        String issuer = asString(claims.get("iss"));
        if (!"accounts.google.com".equals(issuer) && !"https://accounts.google.com".equals(issuer)) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "Issuer của token không hợp lệ");
        }

        String email = asString(claims.get("email"));
        if (email == null || email.isBlank()) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "Token Google không có email");
        }

        // email_verified=false xảy ra với một số tài khoản Google Workspace chưa
        // xác minh. Tin vào email đó là mở đường cho người khác chiếm tài khoản
        // mang email của mình.
        if (!"true".equals(asString(claims.get("email_verified")))) {
            throw new ApiException(
                    ErrorCode.VALIDATION_FAILED,
                    "Email Google này chưa được xác minh, không dùng để đăng nhập được");
        }

        String subject = asString(claims.get("sub"));
        if (subject == null || subject.isBlank()) {
            throw new ApiException(ErrorCode.TOKEN_INVALID, "Token Google thiếu subject");
        }

        return new GoogleUser(subject, email.toLowerCase(), asString(claims.get("name")));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchClaims(String idToken) {
        String url = UriComponentsBuilder.fromHttpUrl(TOKENINFO_URL)
                .queryParam("id_token", idToken)
                .toUriString();
        try {
            Map<String, Object> body = restTemplate.getForObject(url, Map.class);
            if (body == null) {
                throw new ApiException(ErrorCode.TOKEN_INVALID, "Không xác thực được token Google");
            }
            return body;
        } catch (RestClientException ex) {
            // Token hết hạn hay sai định dạng đều ra 4xx ở đây; không log token
            // vì nó là thông tin đăng nhập.
            log.warn("Gọi tokeninfo của Google thất bại: {}", ex.getMessage());
            throw new ApiException(ErrorCode.TOKEN_INVALID, "Token Google không hợp lệ hoặc đã hết hạn");
        }
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
