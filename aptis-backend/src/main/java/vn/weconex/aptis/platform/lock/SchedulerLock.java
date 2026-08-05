package vn.weconex.aptis.platform.lock;

import java.time.Duration;

/**
 * Khóa cho scheduled job, để job không chạy trùng khi có nhiều instance.
 */
public interface SchedulerLock {

    /**
     * Chạy {@code task} nếu giành được khóa.
     *
     * @return true nếu task đã chạy
     */
    boolean runIfAcquired(String lockName, Duration ttl, Runnable task);
}
