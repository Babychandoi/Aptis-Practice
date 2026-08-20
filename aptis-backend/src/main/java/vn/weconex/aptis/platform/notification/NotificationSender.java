package vn.weconex.aptis.platform.notification;

import java.nio.charset.StandardCharsets;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

/**
 * Gửi thông báo nghiệp vụ (khác email xác thực tài khoản ở {@code AuthMailSender}).
 *
 * <p>Gọi từ outbox handler nên KHÔNG bắt lỗi: ném exception để outbox retry.
 * Đây là khác biệt có ý thức so với `AuthMailSender` — email xác thực gửi trực
 * tiếp trong luồng đăng ký nên phải bỏ qua lỗi, còn thông báo qua outbox thì
 * retry được.
 */
@Slf4j
@Component
public class NotificationSender {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String frontendBaseUrl;

    public NotificationSender(
            JavaMailSender mailSender,
            @Value("${aptis.mail.from:no-reply@aptis.local}") String fromAddress,
            @Value("${aptis.cors.allowed-origins:http://localhost:5173}") String frontendBaseUrl) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.frontendBaseUrl = frontendBaseUrl.split(",")[0].strip();
    }

    public void sendPremiumActivated(String email, String planCode, String endsAt) {
        String expiry = endsAt == null || endsAt.isBlank()
                ? "Trọn đời"
                : "Đến " + endsAt.substring(0, Math.min(10, endsAt.length()));

        EmailTemplate.Rendered mail = EmailTemplate.builder("Premium đã được kích hoạt")
                .intro("Cảm ơn bạn — tài khoản của bạn đã được nâng cấp Premium.")
                .fact("Gói", planCode == null ? "Premium" : planCode)
                .fact("Hiệu lực", expiry)
                .paragraph("Bạn đã mở toàn bộ ngân hàng đề Premium, luyện theo Part, "
                        + "mẹo học và chấm Speaking/Writing tự động.")
                .action("Bắt đầu luyện thi", frontendBaseUrl + "/")
                .build();

        send(email, "Premium đã được kích hoạt", mail);
    }

    public void sendEvaluationCompleted(String email, int questionSetCount) {
        EmailTemplate.Rendered mail = EmailTemplate.builder("Bài của bạn đã được chấm")
                .intro("%d bài Speaking/Writing của bạn đã được chấm xong."
                        .formatted(questionSetCount))
                .paragraph("Xem điểm theo từng tiêu chí và nhận xét chi tiết để biết "
                        + "cần cải thiện ở đâu.")
                .action("Xem kết quả", frontendBaseUrl + "/history")
                .build();

        send(email, "Bài của bạn đã được chấm", mail);
    }

    /**
     * Báo quản trị có người vừa khai đã chuyển khoản, cần đối soát sao kê.
     *
     * <p>Gửi tới hộp thư vận hành chứ không phải học viên — đây là việc nội bộ.
     */
    public void sendBankTransferClaimed(
            String adminEmail, String transferCode, String orderCode, long amount) {

        EmailTemplate.Rendered mail = EmailTemplate.builder("Có yêu cầu chuyển khoản cần đối soát")
                .intro("Một học viên vừa báo đã chuyển khoản.")
                .fact("Mã nội dung", transferCode)
                .fact("Đơn hàng", orderCode)
                .fact("Số tiền", "%,d VND".formatted(amount))
                .paragraph("Kiểm tra sao kê ngân hàng, tìm giao dịch có nội dung chứa mã trên. "
                        + "Nếu đã nhận đủ tiền, vào trang Quản trị để xác nhận — hệ thống sẽ "
                        + "tự nâng cấp tài khoản theo gói đã mua.")
                .action("Mở trang đối soát", frontendBaseUrl + "/admin")
                .build();

        send(adminEmail, "Có yêu cầu chuyển khoản cần đối soát: " + transferCode, mail);
    }

    /**
     * Ném {@link MailException} khi gửi thất bại — caller (outbox) sẽ retry.
     */
    private void send(String to, String subject, EmailTemplate.Rendered mail) {
        MimeMessage message = mailSender.createMimeMessage();
        try {
            // true đầu tiên = multipart: kèm cả bản text thuần cho client không
            // đọc HTML, và thư đủ hai phần thì bộ lọc spam đánh giá tốt hơn.
            MimeMessageHelper helper = new MimeMessageHelper(
                    message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(mail.text(), mail.html());
        } catch (MessagingException ex) {
            // Bọc thành MailException để outbox xử lý thống nhất một loại lỗi.
            throw new MailPreparationException("Không dựng được email: " + subject, ex);
        }

        mailSender.send(message);
        log.debug("Đã gửi thông báo '{}' tới {}", subject, to);
    }
}
