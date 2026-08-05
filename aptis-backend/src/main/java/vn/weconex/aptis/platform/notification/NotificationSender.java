package vn.weconex.aptis.platform.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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

    public NotificationSender(
            JavaMailSender mailSender,
            @Value("${aptis.mail.from:no-reply@aptis.local}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public void sendPremiumActivated(String email, String planCode, String endsAt) {
        String expiry = endsAt == null || endsAt.isBlank()
                ? "trọn đời"
                : "đến " + endsAt.substring(0, Math.min(10, endsAt.length()));

        send(email,
                "Premium đã được kích hoạt",
                """
                Chào bạn,

                Gói %s đã được kích hoạt cho tài khoản của bạn (hiệu lực %s).

                Bạn đã mở toàn bộ ngân hàng đề Premium, thi thử đầy đủ và chấm
                Speaking/Writing tự động.

                Chúc bạn ôn tập hiệu quả.
                """.formatted(planCode == null ? "Premium" : planCode, expiry));
    }

    public void sendEvaluationCompleted(String email, int questionSetCount) {
        send(email,
                "Bài của bạn đã được chấm",
                """
                Chào bạn,

                %d bài Speaking/Writing của bạn đã được chấm xong. Đăng nhập để
                xem điểm theo từng tiêu chí và nhận xét chi tiết.
                """.formatted(questionSetCount));
    }

    /**
     * Báo quản trị có người vừa khai đã chuyển khoản, cần đối soát sao kê.
     *
     * <p>Gửi tới hộp thư vận hành chứ không phải học viên — đây là việc nội bộ.
     */
    public void sendBankTransferClaimed(
            String adminEmail, String transferCode, String orderCode, long amount) {

        send(adminEmail,
                "Có yêu cầu chuyển khoản cần đối soát: " + transferCode,
                """
                Có học viên vừa báo đã chuyển khoản.

                Mã nội dung : %s
                Đơn hàng    : %s
                Số tiền     : %,d VND

                Kiểm tra sao kê ngân hàng, tìm giao dịch có nội dung chứa mã
                trên. Nếu đã nhận đủ tiền, vào trang Quản trị > Chuyển khoản để
                xác nhận — hệ thống sẽ tự nâng cấp tài khoản theo gói đã mua.
                """.formatted(transferCode, orderCode, amount));
    }

    /**
     * Ném {@link MailException} khi gửi thất bại — caller (outbox) sẽ retry.
     */
    private void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);

        mailSender.send(message);
        log.debug("Đã gửi thông báo '{}' tới {}", subject, to);
    }
}
