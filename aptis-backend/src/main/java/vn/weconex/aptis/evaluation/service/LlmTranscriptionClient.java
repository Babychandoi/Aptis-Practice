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

    /**
     * Mã model trả về khi bản ghi không có tiếng nói nghe được.
     *
     * <p>Phải là chuỗi không ai nói ra được, vì transcript trùng mã này sẽ bị
     * coi là im lặng. Dặn "trả chuỗi rỗng" thì model lại diễn giải chính câu
     * lệnh đó thành văn bản.
     */
    private static final String NO_SPEECH = "[[NO_SPEECH]]";

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
                        // Không dặn "reply with an empty string": model không nghe
                        // được gì thì diễn giải luôn câu lệnh đó thành transcript
                        // ("An empty string controls output."). Dùng mã canh riêng
                        // để phân biệt "im lặng" với "nghe ra chữ".
                        Map.of("type", "text", "text",
                                "Transcribe this speaking-test recording word for word. "
                                + "Keep the speaker's actual words, including grammar mistakes and "
                                + "repetitions — do not correct them. Output only the transcript, "
                                + "with no commentary, no quotes and no markup. "
                                + "If the recording has no intelligible speech, output exactly "
                                + NO_SPEECH + " and nothing else."),
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
    static String extractContent(String raw) {
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
                return boLopBoc(
                        json.path("choices").path(0).path("message").path("content").asText("").trim());
            } catch (Exception ex) {
                log.warn("STT trả JSON không đọc được: {}", abbreviate(trimmed));
                return "";
            }
        }

        StringBuilder text = new StringBuilder();
        String loiCuoi = null;
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
                JsonNode chunk = MAPPER.readTree(payload);
                // Router báo lỗi giữa chừng stream: giữ lại để log, nếu không
                // hàm trả chuỗi rỗng mà không ai biết vì sao.
                if (chunk.has("error")) {
                    loiCuoi = chunk.path("error").path("message").asText();
                    continue;
                }
                JsonNode choice = chunk.path("choices").path(0);
                JsonNode content = choice.path("delta").path("content");
                if (content.isMissingNode() || content.isNull()) {
                    content = choice.path("message").path("content");
                }
                text.append(content.asText(""));
            } catch (Exception ex) {
                // Bỏ qua chunk lỗi, giữ phần đọc được
                loiCuoi = "chunk không đọc được: " + abbreviate(payload);
            }
        }

        String ketQua = boLopBoc(text.toString().trim());
        if (ketQua.isEmpty()) {
            // Không nghe ra chữ nào là chuyện đáng biết: có thể model từ chối,
            // file hỏng, hoặc router trả định dạng lạ. In cả phản hồi thô vì
            // thiếu nó thì không lần ra được nguyên nhân.
            log.warn("STT không ra chữ nào. {} | Thô: {}",
                    loiCuoi != null ? "Lỗi: " + loiCuoi : "không có lỗi báo về",
                    abbreviate(trimmed));
        }
        return ketQua;
    }

    /**
     * Bóc lớp bọc model hay thêm quanh transcript.
     *
     * <p>Prompt đã dặn "chỉ trả transcript" nhưng gemini-3-flash vẫn gói trong
     * ```xml &lt;transcript&gt;…&lt;/transcript&gt;```. Không bóc thì bản ghi câm
     * ra chuỗi chứa nguyên cái khung, code tưởng là có lời nói rồi đem đi chấm.
     */
    private static String boLopBoc(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String s = value.trim();

        // Mã canh: model báo không nghe được gì.
        if (s.contains(NO_SPEECH)) {
            return "";
        }

        // Hàng rào markdown: ```xml … ``` hoặc ``` … ```
        if (s.startsWith("```")) {
            int dau = s.indexOf('\n');
            int cuoi = s.lastIndexOf("```");
            if (dau > 0 && cuoi > dau) {
                s = s.substring(dau + 1, cuoi).trim();
            }
        }

        // Thẻ <transcript>…</transcript>, kể cả khi rỗng hoặc tự đóng.
        java.util.regex.Matcher m = THE_TRANSCRIPT.matcher(s);
        if (m.find()) {
            s = m.group(1) == null ? "" : m.group(1).trim();
        } else if (s.matches("(?is)<transcript\\s*/>")) {
            s = "";
        }

        return s.trim();
    }

    private static final java.util.regex.Pattern THE_TRANSCRIPT =
            java.util.regex.Pattern.compile("(?is)<transcript>(.*?)</transcript>");

    private static String abbreviate(String value) {
        return value.length() <= 300 ? value : value.substring(0, 300) + "…";
    }
}
