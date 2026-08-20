package vn.weconex.aptis.auth.service;

import java.nio.charset.StandardCharsets;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.platform.notification.EmailTemplate;

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

        EmailTemplate.Rendered mail = EmailTemplate.builder("Xác thực địa chỉ email")
                .intro("Chào bạn, cảm ơn bạn đã tạo tài khoản Aptis Practice.")
                .paragraph("Bấm nút bên dưới để xác thực email và bắt đầu luyện thi.")
                .action("Xác thực email", link)
                .actionNote("Liên kết có hiệu lực trong 24 giờ.")
                .footerNote("Nếu bạn không tạo tài khoản này, hãy bỏ qua email — "
                        + "sẽ không có thay đổi nào xảy ra.")
                .build();

        send(email, "Xác thực tài khoản Aptis Practice", mail);
    }

    @Async
    public void sendPasswordResetEmail(String email, String rawToken) {
        String link = frontendBaseUrl + "/reset-password?token=" + rawToken;

        EmailTemplate.Rendered mail = EmailTemplate.builder("Đặt lại mật khẩu")
                .intro("Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.")
                .paragraph("Bấm nút bên dưới để chọn mật khẩu mới.")
                .action("Đặt lại mật khẩu", link)
                .actionNote("Liên kết có hiệu lực trong 1 giờ và chỉ dùng được một lần.")
                .footerNote("Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. "
                        + "Mật khẩu hiện tại của bạn vẫn giữ nguyên.")
                .build();

        send(email, "Đặt lại mật khẩu Aptis Practice", mail);
    }

    private void send(String to, String subject, EmailTemplate.Rendered mail) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // true đầu tiên = multipart: gửi kèm cả bản text thuần. Client không
            // đọc HTML vẫn thấy nội dung, và thư có đủ hai phần thì bộ lọc spam
            // cũng đánh giá tốt hơn thư chỉ có HTML.
            MimeMessageHelper helper = new MimeMessageHelper(
                    message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(mail.text(), mail.html());
            mailSender.send(message);
        } catch (MailException | jakarta.mail.MessagingException ex) {
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
