package vn.weconex.aptis.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Gửi email xác thực và đặt lại mật khẩu.
 *
 * <p>Gửi bất đồng bộ để lỗi SMTP không làm rollback transaction đăng ký.
 * Khi đưa lên production nên chuyển sang queue (PHẦN VIII §53) để có retry.
 */
@Slf4j
@Component
public class AuthMailSender {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String frontendBaseUrl;

    public AuthMailSender(
            JavaMailSender mailSender,
            @Value("${aptis.mail.from:no-reply@aptis.local}") String fromAddress,
            @Value("${aptis.cors.allowed-origins:http://localhost:5173}") String frontendBaseUrl,
            @Value("${spring.mail.host:localhost}") String mailHost,
            @Value("${spring.mail.username:}") String mailUsername,
            @Value("${spring.mail.password:}") String mailPassword) {

        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        // allowed-origins có thể là danh sách; lấy origin đầu làm base URL
        this.frontendBaseUrl = frontendBaseUrl.split(",")[0].strip();

        // Cấu hình nửa vời chỉ lộ ra khi có người đăng ký rồi không nhận được
        // thư — báo ngay lúc khởi động để khỏi phải đợi tới lúc đó.
        if (!mailUsername.isBlank() && mailPassword.isBlank()) {
            log.error("MAIL_USERNAME đã đặt ({}) nhưng MAIL_PASSWORD trống — "
                    + "SMTP sẽ từ chối. Điền App Password vào .env rồi khởi động lại.",
                    mailUsername);
        } else if (mailHost.contains("gmail") && !mailPassword.isBlank()) {
            log.info("Gửi email qua Gmail bằng tài khoản {}", mailUsername);
        } else if (mailUsername.isBlank()) {
            log.info("Gửi email qua {} không xác thực — thư không ra Internet", mailHost);
        }
    }

    @Async
    public void sendVerificationEmail(String email, String rawToken) {
        String link = frontendBaseUrl + "/verify-email?token=" + rawToken;
        send(email,
                "Xác thực tài khoản Aptis Practice",
                """
                Chào bạn,

                Nhấn vào liên kết sau để xác thực tài khoản:
                %s

                Liên kết có hiệu lực trong 24 giờ.
                """.formatted(link));
    }

    @Async
    public void sendPasswordResetEmail(String email, String rawToken) {
        String link = frontendBaseUrl + "/reset-password?token=" + rawToken;
        send(email,
                "Đặt lại mật khẩu Aptis Practice",
                """
                Chào bạn,

                Nhấn vào liên kết sau để đặt lại mật khẩu:
                %s

                Liên kết có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.
                """.formatted(link));
    }

    private void send(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (MailException ex) {
            // Không ném lại: người dùng vẫn đăng ký được, có thể yêu cầu gửi lại email.
            //
            // Log cả nguyên nhân gốc: với Gmail, thông điệp ngoài cùng chỉ nói
            // "Mail server connection failed", lý do thật (sai App Password,
            // chưa bật 2 bước, bị chặn cổng) nằm ở exception bên trong.
            Throwable root = ex;
            while (root.getCause() != null && root.getCause() != root) {
                root = root.getCause();
            }
            log.error("Không gửi được email tới {} (from={}): {} | nguyên nhân: {}",
                    to, fromAddress, ex.getMessage(), root.toString());
        }
    }
}
