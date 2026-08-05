package vn.weconex.aptis.platform.lock;

import java.time.Duration;
import java.util.UUID;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Khóa phân tán bằng Redis, để scheduled job không chạy trùng khi có nhiều
 * instance backend.
 *
 * <p>Cơ chế: {@code SET key value NX PX ttl}. Mỗi lần khóa sinh một token riêng;
 * lúc nhả chỉ xóa nếu token còn khớp, tránh instance A xóa khóa mà instance B
 * đang giữ (xảy ra khi A bị treo quá TTL rồi tỉnh lại).
 *
 * <p>TTL phải dài hơn thời gian job chạy lâu nhất. Nếu job vượt TTL, khóa tự
 * hết và instance khác có thể chạy song song — chấp nhận được vì mọi job ở đây
 * đều idempotent, nhưng nên đặt TTL đủ rộng.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "aptis.scheduler.lock.enabled", havingValue = "true")
public class DistributedLock implements SchedulerLock {

    /**
     * Nhả khóa nguyên tử: so token rồi xóa. Làm bằng script Lua vì GET + DEL
     * riêng lẻ có khoảng trống để instance khác chen vào giữa.
     */
    private static final String UNLOCK_SCRIPT = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """;

    private static final String KEY_PREFIX = "aptis:lock:";

    private final StringRedisTemplate redis;
    private final DefaultRedisScript<Long> unlockScript;

    public DistributedLock(StringRedisTemplate redis) {
        this.redis = redis;
        this.unlockScript = new DefaultRedisScript<>(UNLOCK_SCRIPT, Long.class);
    }

    /**
     * Chạy {@code task} nếu giành được khóa; bỏ qua nếu instance khác đang giữ.
     *
     * @return true nếu task đã chạy
     */
    @Override
    public boolean runIfAcquired(String lockName, Duration ttl, Runnable task) {
        String key = KEY_PREFIX + lockName;
        String token = UUID.randomUUID().toString();

        Boolean acquired = redis.opsForValue().setIfAbsent(key, token, ttl);
        if (!Boolean.TRUE.equals(acquired)) {
            log.debug("Bỏ qua {}: instance khác đang giữ khóa", lockName);
            return false;
        }

        try {
            task.run();
            return true;
        } finally {
            release(key, token);
        }
    }

    private void release(String key, String token) {
        try {
            redis.execute(unlockScript, java.util.List.of(key), token);
        } catch (Exception ex) {
            // Không nhả được thì khóa tự hết theo TTL — job chỉ bị hoãn một chu kỳ
            log.warn("Không nhả được khóa {}: {}", key, ex.getMessage());
        }
    }
}
