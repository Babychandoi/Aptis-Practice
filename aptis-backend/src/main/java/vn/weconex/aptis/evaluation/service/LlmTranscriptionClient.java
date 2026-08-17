package vn.weconex.aptis.evaluation.service;

import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * Chuyển giọng nói thành văn bản bằng model đa phương thức qua API tương thích
 * OpenAI (9Router).
 *
 * <p>Không dùng {@code /v1/audio/transcriptions}: endpoint đó tồn tại nhưng
 * router chưa có credential STT ("No credentials for provider: openai" /
 * "Provider 'antigravity' does not support STT"). Thay vào đó gửi audio kèm vào
 * {@code /v1/chat/completions} dưới dạng {@code input_audio} — model Gemini nghe
 * trực tiếp file.
 *
 * <p>Model phải chọn đúng: {@code ag/gemini-3-flash} nghe chính xác từng từ và
 * cho kết quả giống nhau qua nhiều lần chạy, còn {@code AI-PRO} cắt giữa câu và
 * có lần trả rỗng — không dùng để chấm thi được.
 *
 * <p>Lợi thế so với Whisper tự host: model nhận AUDIO GỐC nên đánh giá được cả
 * phát âm và độ trôi chảy. Đi qua transcript trước rồi mới chấm sẽ mất thông tin
 * đó — bài phát âm sai thành chữ đúng, nhìn transcript không thấy lỗi.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "aptis.evaluation.stt.enabled", havingValue = "true")
public class LlmTranscriptionClient {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** Định dạng router nhận; MediaRecorder của trình duyệt ghi ra webm/opus. */
    private static final Map<String, String> FORMAT_BY_MIME = Map.of(
            "audio/webm", "webm",
            "audio/ogg", "ogg",
            "audio/mpeg", "mp3",
            "audio/mp4", "mp4",
            "audio/wav", "wav",
            "audio/x-wav", "wav");

    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final RestTemplate restTemplate;

    public LlmTranscriptionClient(
            @Value("${aptis.evaluation.stt.base-url:}") String baseUrl,
            @Value("${aptis.evaluation.stt.api-key:}") String apiKey,
            @Value("${aptis.evaluation.stt.model:ag/gemini-3-flash}") String model,
            @Value("${aptis.evaluation.stt.timeout-seconds:120}") int timeoutSeconds) {

        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        // Nghe file 2 phút mất lâu hơn một lời gọi chat thường.
        factory.setReadTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());
        this.restTemplate = new RestTemplate(factory);

        if (this.baseUrl.isBlank() || this.apiKey.isBlank()) {
            log.warn("STT bật nhưng thiếu base-url hoặc api-key — Speaking sẽ không có transcript.");
        } else {
            log.info("STT sẵn sàng: model={} endpoint={}", model, this.baseUrl);
        }
    }

    /**
     * @param audio    nội dung file ghi âm
     * @param mimeType MIME của file, để khai báo đúng định dạng cho model
     * @return văn bản đã nghe được, hoặc rỗng nếu không nghe ra tiếng nói
     */
    public String transcribe(byte[] audio, String mimeType) {
        if (audio == null || audio.length == 0) {
            return "";
        }

        String format = resolveFormat(mimeType);
        String encoded = Base64.getEncoder().encodeToString(audio);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        // Nhiệt độ 0: nghe lại cùng file phải ra cùng transcript, không sáng tạo.
        body.put("temperature", 0);
        body.put("max_tokens", 2048);
        body.put("stream", false);
        body.put("messages", List.of(Map.of(
                "role", "user",
                "content", List.of(
                        Map.of("type", "text", "text",
                                "Transcribe this English speaking-test recording word for word. "
                                + "Keep the speaker's actual words, including grammar mistakes and "
                                + "repetitions — do not correct them. If there is no speech, reply "
                                + "with an empty string. Reply with the transcript only."),
                        Map.of("type", "input_audio", "input_audio", Map.of(
                                "data", encoded,
                                "format", format))))));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (!apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    chatCompletionsUrl(), HttpMethod.POST,
                    new HttpEntity<>(body, headers), String.class);

            // TranscriptionService đã log kết quả kèm assetId; không log lại ở đây.
            return extractContent(response.getBody());

        } catch (Exception ex) {
            // Không ném lên: thiếu transcript vẫn chấm được theo audio/thời lượng,
            // còn ném thì cả job chấm bị retry rồi FAILED.
            log.error("STT lỗi: {}", ex.getMessage());
            return "";
        }
    }

    private String chatCompletionsUrl() {
        String url = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return url.endsWith("/v1") ? url + "/chat/completions" : url;
    }

    private static String resolveFormat(String mimeType) {
        if (mimeType == null) {
            return "webm";
        }
        // MediaRecorder gửi "audio/webm;codecs=opus" — bỏ phần tham số.
        String base = mimeType.split(";")[0].trim().toLowerCase();
        return FORMAT_BY_MIME.getOrDefault(base, "webm");
    }

    /**
     * Đọc content từ phản hồi.
     *
     * <p>Router trả JSON thường HOẶC chuỗi SSE ({@code data: {...}}) tuỳ model,
     * dù đã gửi {@code stream:false} — nên phải xử lý cả hai.
     */
    private static String extractContent(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String trimmed = raw.trim();

        if (trimmed.startsWith("{")) {
            try {
                JsonNode json = MAPPER.readTree(trimmed);
                if (json.has("error")) {
                    log.warn("STT bị từ chối: {}", json.path("error").path("message").asText());
                    return "";
                }
                return json.path("choices").path(0).path("message").path("content").asText("").trim();
            } catch (Exception ex) {
                log.warn("STT trả JSON không đọc được: {}", abbreviate(trimmed));
                return "";
            }
        }

        StringBuilder text = new StringBuilder();
        for (String line : trimmed.split("\n")) {
            String value = line.trim();
            if (!value.startsWith("data:")) {
                continue;
            }
            String payload = value.substring(5).trim();
            if (payload.isEmpty() || "[DONE]".equals(payload)) {
                continue;
            }
            try {
                JsonNode choice = MAPPER.readTree(payload).path("choices").path(0);
                JsonNode content = choice.path("delta").path("content");
                if (content.isMissingNode() || content.isNull()) {
                    content = choice.path("message").path("content");
                }
                text.append(content.asText(""));
            } catch (Exception ignored) {
                // Bỏ qua chunk lỗi, giữ phần đọc được
            }
        }
        return text.toString().trim();
    }

    private static String abbreviate(String value) {
        return value.length() <= 300 ? value : value.substring(0, 300) + "…";
    }
}
