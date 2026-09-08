package vn.weconex.aptis.platform;

import java.time.Duration;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.billing.service.BankTransferService;
import vn.weconex.aptis.billing.service.OrderService;
import vn.weconex.aptis.billing.service.SubscriptionActivationService;
import vn.weconex.aptis.billing.service.TrialReminderService;
import vn.weconex.aptis.billing.service.TrialService;
import vn.weconex.aptis.evaluation.service.EvaluationDispatcher;
import vn.weconex.aptis.platform.lock.SchedulerLock;
import vn.weconex.aptis.platform.importexport.ExportWorker;
import vn.weconex.aptis.platform.importexport.ImportWorker;
import vn.weconex.aptis.platform.outbox.OutboxDispatcher;

/**
 * Job định kỳ.
 *
 * <p>Mọi job chạy qua {@link SchedulerLock} để không trùng khi có nhiều instance.
 * TTL khóa đặt dài hơn thời gian job chạy dự kiến, nhưng ngắn hơn chu kỳ lặp —
 * nếu job treo, khóa tự hết và chu kỳ sau vẫn chạy được.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledJobs {

    @org.springframework.beans.factory.annotation.Value("${aptis.evaluation.batch-size:16}")
    private int evaluationBatchSize;

    private final SubscriptionActivationService activationService;
    private final OrderService orderService;
    private final BankTransferService bankTransferService;
    private final TrialService trialService;
    private final TrialReminderService trialReminderService;
    private final MaintenanceTasks maintenanceTasks;
    private final EvaluationDispatcher evaluationDispatcher;
    private final OutboxDispatcher outboxDispatcher;
    private final ImportWorker importWorker;
    private final ExportWorker exportWorker;
    private final SchedulerLock lock;

    /**
     * Hết hạn Premium (PHẦN IV §35). Chạy mỗi 15 phút — độ trễ tối đa 15 phút
     * là chấp nhận được vì mọi lần kiểm tra quyền đều so ends_at với NOW().
     */
    @Scheduled(fixedDelay = 15 * 60 * 1000L, initialDelay = 60_000L)
    public void expireSubscriptions() {
        lock.runIfAcquired("expire-subscriptions", Duration.ofMinutes(10), () -> {
            int count = activationService.expireOverdueSubscriptions();
            if (count > 0) {
                log.info("Đã chuyển {} subscription sang EXPIRED", count);
            }
        });
    }

    @Scheduled(fixedDelay = 15 * 60 * 1000L, initialDelay = 90_000L)
    public void expireTrials() {
        lock.runIfAcquired("expire-trials", Duration.ofMinutes(10), () -> {
            int count = trialService.expireOverdueTrials();
            if (count > 0) {
                log.info("Đã chuyển {} lượt dùng thử sang EXPIRED", count);
            }
        });
    }

    /**
     * Nhắc học viên sắp hết và vừa hết dùng thử.
     *
     * <p>Quét mỗi 30 phút là đủ dày: cửa sổ nhắc rộng 12 giờ nên không ai bị bỏ
     * sót, mà cũng không gọi SMTP quá thường xuyên.
     */
    @Scheduled(fixedDelay = 30 * 60 * 1000L, initialDelay = 120_000L)
    public void sendTrialReminders() {
        lock.runIfAcquired("trial-reminders", Duration.ofMinutes(20), () -> {
            int sent = trialReminderService.sendDueReminders();
            if (sent > 0) {
                log.info("Đã gửi {} mail nhắc hạn dùng thử", sent);
            }
        });
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000L, initialDelay = 60_000L)
    public void expireOrders() {
        lock.runIfAcquired("expire-orders", Duration.ofMinutes(4), () -> {
            int count = orderService.expireOverdueOrders();
            if (count > 0) {
                log.info("Đã hủy {} đơn hàng quá hạn thanh toán", count);
            }
        });
    }

    /**
     * Đóng yêu cầu chuyển khoản quá hạn để danh sách chờ đối soát không bị
     * đơn cũ làm nhiễu.
     */
    @Scheduled(fixedDelay = 10 * 60 * 1000L, initialDelay = 100_000L)
    public void expireBankTransfers() {
        lock.runIfAcquired("expire-bank-transfers", Duration.ofMinutes(8), () -> {
            int count = bankTransferService.expireOverdue();
            if (count > 0) {
                log.info("Đã đóng {} yêu cầu chuyển khoản quá hạn", count);
            }
        });
    }

    /**
     * Lượt làm bài quá hạn chuyển sang EXPIRED để không chiếm chỗ và để học viên
     * tạo lượt mới.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000L, initialDelay = 90_000L)
    public void expireAttempts() {
        lock.runIfAcquired("expire-attempts", Duration.ofMinutes(4), () -> {
            int count = maintenanceTasks.expireOverdueAttempts();
            if (count > 0) {
                log.info("Đã đánh dấu {} lượt làm bài hết hạn", count);
            }
        });
    }

    /**
     * Chấm Speaking/Writing. Chạy dày (10 giây) vì học viên đang chờ điểm.
     *
     * <p>Batch nhỏ để một lượt không giữ kết nối DB quá lâu; job còn lại sẽ được
     * xử lý ở lượt sau.
     */
    @Scheduled(fixedDelay = 10_000L, initialDelay = 30_000L)
    public void processEvaluationJobs() {
        lock.runIfAcquired("evaluation-jobs", Duration.ofMinutes(2), () -> {
            // Batch phải đủ lớn để lấp hết luồng chấm song song; batch 5 với
            // 8 luồng thì 3 luồng ngồi không. Trần thật nằm ở tổng số request
            // đồng thời các nhà cung cấp chịu được (LlmProviderPool).
            int processed = evaluationDispatcher.processBatch(evaluationBatchSize);
            if (processed > 0) {
                log.info("Đã chấm {} job Speaking/Writing", processed);
            }
        });
    }

    /**
     * Phát outbox event (PHẦN VIII §54). Chạy dày vì event thường là thông báo
     * cho người dùng đang chờ.
     */
    @Scheduled(fixedDelay = 5_000L, initialDelay = 20_000L)
    public void dispatchOutboxEvents() {
        lock.runIfAcquired("outbox-dispatch", Duration.ofMinutes(2), () -> {
            int published = outboxDispatcher.dispatchBatch(50);
            if (published > 0) {
                log.debug("Đã phát {} outbox event", published);
            }
        });
    }

    /**
     * Import câu hỏi từ Excel. Batch = 1 vì mỗi file có thể hàng nghìn dòng.
     */
    @Scheduled(fixedDelay = 15_000L, initialDelay = 40_000L)
    public void processImportJobs() {
        lock.runIfAcquired("import-jobs", Duration.ofMinutes(20), () -> {
            int processed = importWorker.processQueued(1);
            if (processed > 0) {
                log.info("Đã xử lý {} job import", processed);
            }
        });
    }

    /**
     * Sinh báo cáo. TTL khóa dài vì truy vấn tổng hợp có thể chậm trên dữ liệu
     * lớn.
     */
    @Scheduled(fixedDelay = 15_000L, initialDelay = 50_000L)
    public void processExportJobs() {
        lock.runIfAcquired("export-jobs", Duration.ofMinutes(20), () -> {
            int processed = exportWorker.processQueued(2);
            if (processed > 0) {
                log.info("Đã xử lý {} job export", processed);
            }
        });
    }

    /**
     * Dọn file báo cáo quá hạn khỏi MinIO (PHẦN VI §44). Báo cáo chứa dữ liệu
     * học viên nên quá {@code expires_at} là phải xóa, không chỉ ẩn đi.
     *
     * <p>Chạy mỗi giờ thay vì mỗi ngày để cửa sổ dữ liệu tồn dư sau hạn ngắn
     * lại; batch nhỏ vì mỗi file là một lượt gọi MinIO. Chu kỳ cấu hình được để
     * test end-to-end không phải chờ một tiếng.
     */
    @Scheduled(
            fixedDelayString = "${aptis.export.purge-interval:PT1H}",
            initialDelayString = "${aptis.export.purge-initial-delay:PT2M}")
    public void purgeExpiredExports() {
        lock.runIfAcquired("purge-exports", Duration.ofMinutes(15), () -> {
            int purged = maintenanceTasks.purgeExpiredExports(50);
            if (purged > 0) {
                log.info("Đã xóa {} file báo cáo quá hạn", purged);
            }
        });
    }

    /**
     * Dọn refresh token đã hết hạn quá 30 ngày — giữ một khoảng để còn điều tra
     * được nếu có sự cố bảo mật.
     */
    @Scheduled(cron = "0 30 3 * * *")
    public void cleanupExpiredTokens() {
        lock.runIfAcquired("cleanup-tokens", Duration.ofMinutes(30), () -> {
            int deleted = maintenanceTasks.deleteStaleRefreshTokens();
            if (deleted > 0) {
                log.info("Đã xóa {} refresh token hết hạn", deleted);
            }
        });
    }

}
