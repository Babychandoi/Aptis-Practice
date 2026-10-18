package vn.weconex.aptis.billing.service;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import vn.weconex.aptis.billing.repository.BankAccountRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.platform.audit.AuditService;

@Service
@RequiredArgsConstructor
public class SepaySettingsService {
    private final JdbcTemplate jdbc;
    private final SepaySecretCipher cipher;
    private final BankAccountRepository banks;
    private final AuditService audit;
    @Value("${aptis.seo.public-origin:https://aptispractices.io.vn}") private String publicOrigin;

    public record Settings(boolean enabled, String bankAccountId, String authMode, String secretCiphertext, String lastFour) {}
    public record Status(boolean enabled, String bankAccountId, String authMode, boolean secretConfigured,
                         String maskedSecret, String webhookUrl) {}
    @Transactional(readOnly = true)
    public Settings settings() { return read(false); }
    private Settings read(boolean lock) {
        return jdbc.queryForObject("SELECT * FROM sepay_settings WHERE id=1" + (lock ? " FOR UPDATE" : ""),
                (row, index) -> new Settings(row.getBoolean("enabled"), row.getString("bank_account_id"),
                        row.getString("auth_mode"), row.getString("secret_ciphertext"), row.getString("secret_last_four")));
    }
    public String secret(Settings settings) { return cipher.decrypt(settings.secretCiphertext()); }
    public Status status() {
        Settings s = settings();
        return new Status(s.enabled(), s.bankAccountId(), s.authMode(), s.secretCiphertext() != null,
                s.lastFour() == null ? null : "••••" + s.lastFour(),
                publicOrigin.replaceAll("/+$", "") + "/api/v1/payments/webhooks/sepay");
    }
    @Transactional
    public Status update(String actorId, boolean enabled, String bankAccountId, String authMode, String secret) {
        Settings old = read(true);
        if (!"HMAC".equals(authMode) && !"API_KEY".equals(authMode)) throw bad("Kiểu xác thực SePay không hợp lệ");
        boolean newSecret = secret != null && !secret.isBlank();
        if (newSecret && (secret.length() < 32 || secret.length() > 256 || !secret.equals(secret.trim()))) {
            throw bad("Khóa webhook cần 32–256 ký tự, không có khoảng trắng đầu/cuối");
        }
        if (!old.authMode().equals(authMode) && !newSecret) throw bad("Đổi kiểu xác thực cần nhập khóa mới");
        String encrypted = newSecret ? cipher.encrypt(secret) : old.secretCiphertext();
        String last = newSecret ? secret.substring(secret.length() - 4) : old.lastFour();
        if (bankAccountId != null && !bankAccountId.isBlank()) banks.findById(bankAccountId)
                .orElseThrow(() -> bad("Không tìm thấy ngân hàng nhận tiền đã chọn"));
        else bankAccountId = null;
        if (enabled) {
            if (encrypted == null || bankAccountId == null) throw bad("Chọn ngân hàng và lưu khóa webhook trước khi bật SePay");
            if (!banks.findById(bankAccountId).orElseThrow().isActive()) throw bad("Ngân hàng nhận tiền đang tắt");
        }
        jdbc.update("UPDATE sepay_settings SET enabled=?,bank_account_id=?,auth_mode=?,secret_ciphertext=?,secret_last_four=?,updated_at=UTC_TIMESTAMP() WHERE id=1",
                enabled, bankAccountId, authMode, encrypted, last);
        audit.record(actorId, "SEPAY_SETTINGS_UPDATE", "SEPAY_SETTINGS", "1", null,
                Map.of("enabled", enabled, "authMode", authMode, "secretChanged", newSecret));
        return status();
    }
    public boolean automaticFor(String bankAccountId) {
        Settings s = settings();
        return s.enabled() && s.secretCiphertext() != null && bankAccountId.equals(s.bankAccountId());
    }
    private ApiException bad(String message) { return new ApiException(ErrorCode.VALIDATION_FAILED, message); }
}
