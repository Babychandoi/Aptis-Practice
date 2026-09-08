package vn.weconex.aptis.billing.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.billing.domain.TrialReminder;
import vn.weconex.aptis.billing.repository.TrialReminderRepository;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.platform.notification.NotificationSender;

/**
 * Nhắc học viên về hạn dùng thử.
 *
 * <p>Vì sao cần: 92/162 tài khoản hết hạn chưa từng làm một bài nào — họ đăng ký
 * rồi để trôi hết thời gian dùng thử. Và người có học thì chỉ biết mình hết hạn
 * lúc bị chặn giữa bài, nên cảm giác là bị mất quyền chứ không phải được mời mua.
 *
 * <p>Hai mốc: trước khi hết (còn ít giờ) và ngay sau khi hết. Mỗi mốc gửi đúng
 * một lần cho mỗi người, chặn bằng bảng {@code trial_reminders}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrialReminderService {

    /**
     * Cửa sổ nhắc trước: hạn rơi vào 12 giờ tới.
     *
     * <p>Với dùng thử 2 ngày thì nhắc sớm hơn là vô nghĩa (vừa đăng ký đã nhắc),
     * còn muộn hơn thì học viên không còn thời gian làm gì.
     */
    private static final Duration BEFORE_WINDOW = Duration.ofHours(12);

    /**
     * Cửa sổ nhắc sau: vừa hết trong 12 giờ qua.
     *
     * <p>Không lấy rộng hơn để tránh gửi cho người hết hạn từ lâu — với họ đây là
     * thư đến muộn nhiều ngày, dễ bị coi là spam.
     */
    private static final Duration AFTER_WINDOW = Duration.ofHours(12);

    /** Chặn số mail mỗi lượt: SMTP có giới hạn, và một lượt kẹt không nên chặn job. */
    private static final int BATCH = 100;

    private final TrialReminderRepository reminderRepository;
    private final NotificationSender notificationSender;
    private final AptisProperties properties;

    /** @return số mail đã gửi */
    @Transactional
    public int sendDueReminders() {
        int trialDays = properties.entitlement().signupTrialDays();
        if (trialDays <= 0) {
            return 0;
        }

        Instant now = Instant.now();
        int sent = 0;

        // Sắp hết: hạn nằm giữa bây giờ và 12 giờ tới
        sent += send(
                TrialReminder.BEFORE_EXPIRY,
                trialDays,
                now,
                now.plus(BEFORE_WINDOW),
                now,
                (email, endsAt) -> notificationSender.sendTrialEndingSoon(
                        email, Math.max(0, Duration.between(now, endsAt).toHours())));

        // Vừa hết: hạn nằm trong 12 giờ vừa qua
        sent += send(
                TrialReminder.AFTER_EXPIRY,
                trialDays,
                now.minus(AFTER_WINDOW),
                now,
                now,
                (email, endsAt) -> notificationSender.sendTrialExpired(email));

        return sent;
    }

    private interface MailAction {
        void send(String email, Instant trialEndsAt);
    }

    /**
     * DATETIME của MySQL về dưới dạng Timestamp hoặc LocalDateTime tuỳ driver,
     * nên phải nhận cả hai. Không đọc được thì dùng mốc cửa sổ làm dự phòng —
     * số giờ hiển thị lệch chút vẫn hơn là không gửi được mail.
     */
    private static Instant toInstant(Object value, Instant fallback) {
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof java.time.LocalDateTime local) {
            return local.toInstant(java.time.ZoneOffset.UTC);
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        return fallback;
    }

    private int send(
            String kind, int trialDays, Instant from, Instant to, Instant now, MailAction action) {

        List<Object[]> rows = reminderRepository.findDueForReminder(
                trialDays, from, to, properties.entitlement().premiumCode(), now, kind, BATCH);

        int sent = 0;
        for (Object[] row : rows) {
            String userId = (String) row[0];
            String email = (String) row[1];
            if (email == null || email.isBlank()) {
                continue;
            }

            // Hạn thật của CHÍNH người này, không phải mốc cuối cửa sổ: hai
            // người trong cùng lượt quét có hạn lệch nhau tới 12 giờ.
            Instant trialEndsAt = toInstant(row[2], to);

            // Ghi dấu TRƯỚC khi gửi: gửi được mà chưa ghi thì lượt sau gửi lại,
            // còn ghi rồi mà gửi lỗi thì chỉ mất một mail nhắc. Thà thiếu một
            // mail hơn là spam học viên.
            reminderRepository.save(new TrialReminder(userId, kind));

            try {
                action.send(email, trialEndsAt);
                sent += 1;
            } catch (RuntimeException ex) {
                log.warn("Không gửi được mail nhắc {} cho {}: {}", kind, email, ex.getMessage());
            }
        }
        return sent;
    }
}
