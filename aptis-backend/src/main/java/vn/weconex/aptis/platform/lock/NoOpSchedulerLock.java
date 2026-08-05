package vn.weconex.aptis.platform.lock;

import java.time.Duration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Khóa rỗng — luôn chạy task, dùng khi chỉ có một instance backend.
 *
 * <p>Tự động dùng khi {@code aptis.scheduler.lock.enabled} chưa bật, để dev
 * không cần Redis. Bật cờ đó ở môi trường nhiều instance, nếu không job sẽ chạy
 * trùng: email gửi hai lần, subscription bị xử lý hết hạn đồng thời.
 */
@Slf4j
@Component
// matchIfMissing: mặc định dùng bản no-op, không cần khai báo gì ở dev.
// Dùng cùng property với DistributedLock nên hai bean loại trừ nhau tường minh,
// không phụ thuộc thứ tự quét bean như @ConditionalOnMissingBean.
@ConditionalOnProperty(
        name = "aptis.scheduler.lock.enabled", havingValue = "false", matchIfMissing = true)
public class NoOpSchedulerLock implements SchedulerLock {

    public NoOpSchedulerLock() {
        log.info("Scheduled job chạy không khóa phân tán — chỉ an toàn khi có "
                + "MỘT instance backend. Nhiều instance: bật aptis.scheduler.lock.enabled");
    }

    @Override
    public boolean runIfAcquired(String lockName, Duration ttl, Runnable task) {
        task.run();
        return true;
    }
}
