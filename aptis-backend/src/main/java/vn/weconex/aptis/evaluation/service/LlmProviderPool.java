package vn.weconex.aptis.evaluation.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Danh sách nhà cung cấp LLM cho việc chấm bài, xoay vòng và tự né cái đang hỏng.
 *
 * <p>Vì sao cần: một endpoint duy nhất là một điểm chết. Tunnel 9Router từng trả
 * 530 suốt nhiều giờ, và lúc đó mọi bài Speaking/Writing đều rơi về
 * {@code heuristic-v1} — điểm không phải AI chấm.
 *
 * <p>Hai cơ chế bảo vệ, cả hai đều xuất phát từ số đo thật:
 *
 * <ul>
 *   <li><b>Trần đồng thời riêng từng provider.</b> DS2API chỉ nhận 10 request
 *       cùng lúc; request thứ 11 bị trả 429 ngay chứ không xếp hàng, nên bài
 *       chấm mất luôn. 9Router chịu được 50 đồng thời vẫn 100% thành công.
 *   <li><b>Ngắt tạm khi lỗi liên tiếp.</b> Provider sập thì bỏ qua trong một
 *       khoảng, tránh đốt thời gian chờ timeout cho mọi job.
 * </ul>
 *
 * <p>Cấu hình bằng chuỗi nhiều dòng, mỗi dòng một provider:
 * {@code <baseUrl>|<apiKey>|<model>|<maxConcurrent>}. Bỏ trống thì rơi về
 * {@code aptis.evaluation.llm.base-url} cũ nên cấu hình cũ vẫn chạy.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "aptis.evaluation.llm.enabled", havingValue = "true")
public class LlmProviderPool {

    /** Số lần lỗi liên tiếp trước khi tạm ngắt một provider. */
    private static final int FAILURES_BEFORE_TRIP = 3;

    /** Thời gian nghỉ của provider bị ngắt. */
    private static final Duration COOLDOWN = Duration.ofMinutes(2);

    private final List<Provider> providers;
    private final AtomicInteger cursor = new AtomicInteger();

    public LlmProviderPool(
            @Value("${aptis.evaluation.llm.providers:}") String providersConfig,
            @Value("${aptis.evaluation.llm.base-url:}") String fallbackUrl,
            @Value("${aptis.evaluation.llm.api-key:}") String fallbackKey,
            @Value("${aptis.evaluation.llm.model:AI-PRO}") String fallbackModel,
            @Value("${aptis.evaluation.llm.max-concurrent:8}") int fallbackConcurrency) {

        this.providers = parse(providersConfig);

        if (providers.isEmpty() && fallbackUrl != null && !fallbackUrl.isBlank()) {
            providers.add(new Provider(
                    fallbackUrl.trim(),
                    fallbackKey == null ? "" : fallbackKey.trim(),
                    fallbackModel,
                    Math.max(1, fallbackConcurrency)));
        }

        if (providers.isEmpty()) {
            log.warn("Không có nhà cung cấp LLM nào — mọi lượt chấm sẽ rơi về heuristic.");
        } else {
            for (Provider provider : providers) {
                log.info("Nhà cung cấp chấm bài: {} model={} tối đa {} request đồng thời",
                        provider.baseUrl(), provider.model(), provider.maxConcurrent());
            }
        }
    }

    private static List<Provider> parse(String raw) {
        List<Provider> parsed = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            return parsed;
        }
        for (String line : raw.split("[\\r\\n;]+")) {
            String entry = line.trim();
            if (entry.isEmpty() || entry.startsWith("#")) {
                continue;
            }
            // Giữ chuỗi rỗng ở giữa: khoá có thể trống với provider chạy local.
            String[] parts = entry.split("\\|", -1);
            if (parts[0].isBlank()) {
                log.warn("Bỏ qua nhà cung cấp thiếu base-url: {}", entry);
                continue;
            }
            parsed.add(new Provider(
                    parts[0].trim(),
                    parts.length > 1 ? parts[1].trim() : "",
                    parts.length > 2 && !parts[2].isBlank() ? parts[2].trim() : "AI-PRO",
                    parts.length > 3 ? parsePositiveInt(parts[3], 8) : 8));
        }
        return parsed;
    }

    private static int parsePositiveInt(String value, int fallback) {
        try {
            int parsed = Integer.parseInt(value.trim());
            return parsed > 0 ? parsed : fallback;
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    public boolean isEmpty() {
        return providers.isEmpty();
    }

    public List<Provider> all() {
        return List.copyOf(providers);
    }

    /**
     * Mượn một provider còn chỗ, ưu tiên cái chưa bị ngắt.
     *
     * <p>Con trỏ xoay vòng nên tải rải đều thay vì dồn hết vào provider đầu.
     * Trả {@code null} khi mọi provider đều đầy hoặc đang bị ngắt — người gọi
     * nên để job lại hàng đợi thay vì ép gọi và nhận 429.
     */
    public Lease acquire() {
        if (providers.isEmpty()) {
            return null;
        }
        int size = providers.size();
        int start = Math.floorMod(cursor.getAndIncrement(), size);
        Instant now = Instant.now();

        // Vòng 1: chỉ lấy provider đang khoẻ.
        for (int offset = 0; offset < size; offset++) {
            Provider provider = providers.get((start + offset) % size);
            if (!provider.isTripped(now) && provider.slots().tryAcquire()) {
                return new Lease(provider);
            }
        }
        // Vòng 2: mọi provider đều bị ngắt — vẫn thử một cái để hệ thống tự hồi
        // thay vì đứng im chờ hết cooldown.
        for (int offset = 0; offset < size; offset++) {
            Provider provider = providers.get((start + offset) % size);
            if (provider.slots().tryAcquire()) {
                return new Lease(provider);
            }
        }
        return null;
    }

    /** Một endpoint cùng hạn mức đồng thời và trạng thái sức khoẻ của nó. */
    public static final class Provider {
        private final String baseUrl;
        private final String apiKey;
        private final String model;
        private final int maxConcurrent;
        private final Semaphore slots;
        private final AtomicInteger consecutiveFailures = new AtomicInteger();
        private final AtomicReference<Instant> trippedUntil = new AtomicReference<>();

        Provider(String baseUrl, String apiKey, String model, int maxConcurrent) {
            this.baseUrl = baseUrl;
            this.apiKey = apiKey;
            this.model = model;
            this.maxConcurrent = maxConcurrent;
            this.slots = new Semaphore(maxConcurrent);
        }

        public String baseUrl() {
            return baseUrl;
        }

        public String apiKey() {
            return apiKey;
        }

        public String model() {
            return model;
        }

        public int maxConcurrent() {
            return maxConcurrent;
        }

        Semaphore slots() {
            return slots;
        }

        boolean isTripped(Instant now) {
            Instant until = trippedUntil.get();
            if (until == null) {
                return false;
            }
            if (now.isBefore(until)) {
                return true;
            }
            // Hết hạn nghỉ: mở lại và cho đếm lỗi từ đầu.
            trippedUntil.compareAndSet(until, null);
            consecutiveFailures.set(0);
            return false;
        }

        void recordSuccess() {
            consecutiveFailures.set(0);
            trippedUntil.set(null);
        }

        void recordFailure() {
            if (consecutiveFailures.incrementAndGet() >= FAILURES_BEFORE_TRIP) {
                trippedUntil.set(Instant.now().plus(COOLDOWN));
                log.warn("Tạm ngắt nhà cung cấp {} trong {} do {} lỗi liên tiếp",
                        baseUrl, COOLDOWN, FAILURES_BEFORE_TRIP);
            }
        }
    }

    /**
     * Quyền dùng một provider; phải trả lại bằng {@link #close()} kể cả khi lỗi.
     * Dùng với try-with-resources.
     */
    public static final class Lease implements AutoCloseable {
        private final Provider provider;
        private boolean released;

        Lease(Provider provider) {
            this.provider = provider;
        }

        public Provider provider() {
            return provider;
        }

        public void markSuccess() {
            provider.recordSuccess();
        }

        public void markFailure() {
            provider.recordFailure();
        }

        @Override
        public void close() {
            if (!released) {
                released = true;
                provider.slots().release();
            }
        }
    }
}
