package vn.weconex.aptis.evaluation.service;

import java.time.Duration;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import vn.weconex.aptis.common.util.Enums.EvaluationType;

/**
 * Chấm Speaking/Writing bằng LLM qua API tương thích OpenAI (9Router).
 *
 * <p>Khác {@link HeuristicEvaluationEngine} — bản đó chỉ đếm từ và dò từ nối,
 * đủ để chạy luồng nhưng không phản ánh chất lượng ngôn ngữ.
 *
 * <p>Speaking đã được {@link TranscriptionService} chuyển thành văn bản trước
 * khi tới đây, nên engine chỉ làm việc với chữ.
 *
 * <p>Không tin đầu ra của mô hình: điểm phải nằm trong khoảng của rubric, đủ
 * mọi tiêu chí, và tổng được tính lại từ các tiêu chí thay vì lấy số mô hình
 * đưa ra. Sai định dạng thì ném lỗi để dispatcher thử lại.
 */
@Slf4j
@Component
@Order(0) // Phải đứng trước HeuristicEvaluationEngine: worker lấy engine đầu tiên khớp
@ConditionalOnProperty(name = "aptis.evaluation.llm.enabled", havingValue = "true")
public class LlmEvaluationEngine implements EvaluationEngine {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    private static final int MAX_MODEL_RESPONSE_CHARS = 200_000;

    /**
     * Bậc CEFR hợp lệ — phải khớp {@code Enums.CefrLevel}, KHÔNG có A0.
     *
     * Trả bậc ngoài danh sách này thì lưu điểm sẽ vỡ với
     * "No enum constant ... CefrLevel.A0" và job bị retry tới FAILED.
     */
    private static final List<String> CEFR_LEVELS =
            List.of("A1", "A2", "B1", "B2", "C1", "C2");

    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final double temperature;
    private final int maxTokens;
    private final RestTemplate restTemplate;

    public LlmEvaluationEngine(
            @Value("${aptis.evaluation.llm.base-url:}") String baseUrl,
            @Value("${aptis.evaluation.llm.api-key:}") String apiKey,
            @Value("${aptis.evaluation.llm.model:AI-PRO}") String model,
            @Value("${aptis.evaluation.llm.temperature:0.2}") double temperature,
            @Value("${aptis.evaluation.llm.max-tokens:2048}") int maxTokens,
            @Value("${aptis.evaluation.llm.timeout-seconds:60}") int timeoutSeconds) {

        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.temperature = temperature;
        this.maxTokens = maxTokens;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        // Chấm một bài mất vài chục giây; đọc timeout phải rộng hơn nhiều so với
        // một lời gọi chat thông thường.
        factory.setReadTimeout((int) Duration.ofSeconds(timeoutSeconds).toMillis());
        this.restTemplate = new RestTemplate(factory);

        if (this.baseUrl.isBlank() || this.apiKey.isBlank()) {
            log.warn("LlmEvaluationEngine bật nhưng thiếu base-url hoặc api-key — "
                    + "mọi lượt chấm sẽ lỗi và bị đưa vào retry.");
        } else {
            log.info("LlmEvaluationEngine sẵn sàng: model={} endpoint={}", model, this.baseUrl);
        }
    }

    @Override
    public boolean supports(EvaluationType type) {
        return type == EvaluationType.WRITING_AI || type == EvaluationType.SPEAKING_AI;
    }

    @Override
    public String engineName() {
        return "llm-" + model;
    }

    @Override
    public EvaluationResult evaluate(EvaluationRequest request) {
        validateRequest(request);
        String answer = request.type() == EvaluationType.SPEAKING_AI
                ? request.transcript()
                : request.textResponse();

        // Bài trống vẫn phải ra kết quả 0 điểm, không gọi API cho tốn lượt.
        if (answer == null || answer.isBlank()) {
            return zeroResult(request.rubric(), request.type());
        }

        try {
            JsonNode parsed = callModel(buildSystemPrompt(request), buildUserPrompt(request, answer));
            return toResult(parsed, request.rubric(), request);
        } catch (EvaluationProviderException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new EvaluationProviderException(
                    "Không gọi được 9Router: " + safeMessage(ex), ex);
        } catch (RuntimeException ex) {
            throw new EvaluationProviderException(
                    "Kết quả chấm từ 9Router không hợp lệ: " + safeMessage(ex), ex);
        }
    }

    // -----------------------------------------------------------------
    // Prompt
    // -----------------------------------------------------------------

    private String buildSystemPrompt(EvaluationRequest request) {
        String skill = request.type() == EvaluationType.SPEAKING_AI ? "Speaking" : "Writing";
        StringBuilder criteria = new StringBuilder();
        for (CriterionSpec criterion : request.rubric().criteria()) {
            criteria.append("- ").append(criterion.code())
                    .append(" (").append(criterion.name() == null ? criterion.code() : criterion.name())
                    .append("), max ").append(trimNumber(criterion.maxScore())).append('\n');
        }
        String speakingRules = request.type() == EvaluationType.SPEAKING_AI
                ? """
                - You do NOT receive or hear the audio.
                - For FLUENCY, use only the supplied local acoustic metrics.
                - For PRONUNCIATION, use only pronunciationClarityEstimate/asrConfidence and describe it as an estimate.
                - Never claim that you heard a sound, stress pattern, or pronunciation error.
                - Do not mention pronunciation, accent, voice or hearing in summary/strengths/weaknesses/suggestions;
                  the backend supplies the only allowed pronunciation feedback.
                """
                : "";

        return """
                You are an experienced Aptis ESOL examiner marking a %s response.

                Mark against these criteria and no others:
                %s
                Rules:
                - Give a score for EVERY criterion listed, using its own maximum.
                - Every score MUST be a whole number (0, 1, 2, ...). Never use decimals.
                - A score must never exceed the criterion's maximum.
                - Judge only the language produced. Do not reward length alone.
                - Feedback must be concrete and in Vietnamese, addressed to the learner.
                %s

                Reply with raw JSON only — no markdown fence, no commentary:
                {"criteria":[{"code":"<criterion code>","score":<number>,\
                "feedback":"<Vietnamese, one or two sentences>"}],
                 "cefrLevel":"<A1|A2|B1|B2|C1|C2>",
                 "summary":"<Vietnamese, one or two sentences>",
                 "strengths":["<Vietnamese>"],
                 "weaknesses":["<Vietnamese>"],
                 "suggestions":["<Vietnamese>"],
                 "correctedVersion":"<improved version of the learner's answer, same language as the answer>"}
                """.formatted(skill, criteria, speakingRules);
    }

    private String buildUserPrompt(EvaluationRequest request, String answer) {
        StringBuilder prompt = new StringBuilder();

        if (request.promptText() != null && !request.promptText().isBlank()) {
            prompt.append("Task:\n").append(request.promptText().trim()).append("\n\n");
        }

        Object minWords = request.constraints() == null ? null : request.constraints().get("minWords");
        Object maxWords = request.constraints() == null ? null : request.constraints().get("maxWords");
        if (minWords instanceof Number min && maxWords instanceof Number max
                && (min.intValue() > 0 || max.intValue() > 0)) {
            prompt.append("Expected length: ").append(min).append('-').append(max)
                    .append(" words.\n\n");
        }

        if (request.type() == EvaluationType.SPEAKING_AI) {
            prompt.append("This is an automatic transcript of the learner's speech, "
                    + "so ignore punctuation and spelling.\n");
            if (request.durationMs() != null) {
                prompt.append("Speaking time: ").append(request.durationMs() / 1000)
                        .append(" seconds.\n");
            }
            if (request.acousticMetrics() != null && !request.acousticMetrics().isEmpty()) {
                prompt.append("Local acoustic metrics (measured from the audio; do not invent others):\n")
                        // valueToTree is generic; passing it straight to StringBuilder can make
                        // javac infer CharSequence and cause an ObjectNode cast at runtime.
                        .append(MAPPER.valueToTree(request.acousticMetrics()).toString())
                        .append("\n");
            }
            prompt.append('\n');
        }

        prompt.append("Learner's answer:\n").append(answer.trim());
        return prompt.toString();
    }

    // -----------------------------------------------------------------
    // Gọi API
    // -----------------------------------------------------------------

    private JsonNode callModel(String systemPrompt, String userPrompt) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)));
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);
        body.put("stream", false);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (!apiKey.isBlank()) {
            headers.setBearerAuth(apiKey);
        }

        ResponseEntity<Map> response = restTemplate.exchange(
                chatCompletionsUrl(), HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

        ModelMessage message = extractContent(response);
        if ("length".equalsIgnoreCase(message.finishReason())) {
            throw new EvaluationProviderException(
                    "9Router dừng do hết giới hạn output token; cần retry");
        }
        return parseModelJson(message.content());
    }

    /** Ghép đường dẫn giống law-app: base kết thúc /v1 thì nối /chat/completions. */
    private String chatCompletionsUrl() {
        String url = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return url.endsWith("/v1") ? url + "/chat/completions" : url;
    }

    record ModelMessage(String content, String finishReason) {
    }

    /** Safely accepts both string content and OpenAI-style text content parts. */
    static ModelMessage extractContent(ResponseEntity<?> response) {
        Object rawBody = response.getBody();
        if (!(rawBody instanceof Map<?, ?> body)) {
            throw new EvaluationProviderException("9Router trả về body rỗng hoặc sai kiểu");
        }
        Object rawChoices = body.get("choices");
        if (!(rawChoices instanceof List<?> choices) || choices.isEmpty()) {
            Object error = body.get("error");
            String detail = error == null ? abbreviate(body.toString()) : abbreviate(error.toString());
            throw new EvaluationProviderException("9Router trả về không có choices: " + detail);
        }
        if (!(choices.get(0) instanceof Map<?, ?> choice)) {
            throw new EvaluationProviderException("9Router trả về choices[0] sai kiểu");
        }
        if (!(choice.get("message") instanceof Map<?, ?> message)) {
            throw new EvaluationProviderException("9Router trả về thiếu choices[0].message");
        }
        String content = contentText(message.get("content"));
        if (content == null || content.isBlank()) {
            throw new EvaluationProviderException("9Router trả về message.content rỗng");
        }
        Object finishReason = choice.get("finish_reason");
        return new ModelMessage(
                content,
                finishReason == null ? null : finishReason.toString());
    }

    private static String contentText(Object content) {
        if (content instanceof String text) {
            return text;
        }
        if (content instanceof Map<?, ?> map && map.get("text") instanceof String text) {
            return text;
        }
        if (content instanceof List<?> parts) {
            StringBuilder joined = new StringBuilder();
            for (Object part : parts) {
                String text = contentText(part);
                if (text != null && !text.isBlank()) {
                    joined.append(text);
                }
            }
            return joined.toString();
        }
        return null;
    }

    /**
     * Parses strict JSON, a double-encoded JSON string, or the first balanced
     * object inside markdown/commentary. Truncated JSON is deliberately rejected:
     * guessing missing criteria could silently award a wrong score.
     */
    static JsonNode parseModelJson(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new EvaluationProviderException("9Router trả về nội dung rỗng");
        }
        if (raw.length() > MAX_MODEL_RESPONSE_CHARS) {
            throw new EvaluationProviderException("Kết quả 9Router vượt giới hạn an toàn");
        }
        String text = raw.strip().replaceFirst("^\\uFEFF", "");

        JsonNode direct = tryReadJson(text);
        if (direct != null) {
            if (direct.isTextual()) {
                direct = tryReadJson(direct.asText());
            }
            return requireObject(direct, raw);
        }

        for (int start = text.indexOf('{'); start >= 0; start = text.indexOf('{', start + 1)) {
            int end = balancedObjectEnd(text, start);
            if (end < 0) {
                continue;
            }
            JsonNode candidate = tryReadJson(text.substring(start, end + 1));
            if (candidate != null && candidate.isObject()) {
                return candidate;
            }
        }

        log.error("LLM trả về không phải JSON object hoàn chỉnh: {}", abbreviate(raw));
        throw new EvaluationProviderException(
                "9Router trả về JSON bị cắt hoặc sai cú pháp; hệ thống sẽ retry");
    }

    private static JsonNode tryReadJson(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return MAPPER.readTree(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static void validateRequest(EvaluationRequest request) {
        if (request == null || request.type() == null) {
            throw new IllegalArgumentException("Thiếu loại bài cần chấm");
        }
        if (request.rubric() == null || request.rubric().criteria() == null
                || request.rubric().criteria().isEmpty()) {
            throw new IllegalArgumentException("Rubric không có tiêu chí chấm");
        }
        for (CriterionSpec criterion : request.rubric().criteria()) {
            if (criterion == null || criterion.code() == null || criterion.code().isBlank()
                    || !Double.isFinite(criterion.maxScore()) || criterion.maxScore() <= 0) {
                throw new IllegalArgumentException("Rubric có tiêu chí không hợp lệ");
            }
        }
    }

    private static JsonNode requireObject(JsonNode node, String raw) {
        if (node == null || !node.isObject()) {
            log.error("LLM trả về JSON không phải object: {}", abbreviate(raw));
            throw new EvaluationProviderException("JSON chấm điểm phải là một object");
        }
        return node;
    }

    private static int balancedObjectEnd(String text, int start) {
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int index = start; index < text.length(); index++) {
            char current = text.charAt(index);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (current == '\\') {
                    escaped = true;
                } else if (current == '"') {
                    inString = false;
                }
                continue;
            }
            if (current == '"') {
                inString = true;
            } else if (current == '{') {
                depth++;
            } else if (current == '}' && --depth == 0) {
                return index;
            }
        }
        return -1;
    }

    // -----------------------------------------------------------------
    // Chuyển đổi và kiểm tra
    // -----------------------------------------------------------------

    private EvaluationResult toResult(
            JsonNode json, RubricSpec rubric, EvaluationRequest request) {
        JsonNode criteriaNode = json.path("criteria");
        if (!criteriaNode.isArray()) {
            throw new IllegalStateException("LLM trả về thiếu mảng criteria");
        }

        Map<String, JsonNode> byCode = new LinkedHashMap<>();
        for (JsonNode node : criteriaNode) {
            if (!node.isObject()) {
                throw new IllegalStateException("Mỗi phần tử criteria phải là object");
            }
            String code = node.path("code").asText(null);
            if (code == null || code.isBlank()) {
                throw new IllegalStateException("Có tiêu chí thiếu code");
            }
            if (code.length() > 100) {
                throw new IllegalStateException("Mã tiêu chí dài quá 100 ký tự");
            }
            String normalized = code.trim().toUpperCase(Locale.ROOT);
            if (byCode.putIfAbsent(normalized, node) != null) {
                throw new IllegalStateException("LLM trả trùng tiêu chí " + normalized);
            }
        }

        List<CriterionScore> scores = new ArrayList<>();
        double total = 0;
        double max = 0;

        // Duyệt theo rubric chứ không theo thứ tự mô hình trả về: thiếu tiêu chí
        // nào là hỏng, thừa tiêu chí lạ thì bỏ qua.
        for (CriterionSpec criterion : rubric.criteria()) {
            JsonNode node = byCode.get(criterion.code().toUpperCase(Locale.ROOT));
            if (node == null) {
                throw new IllegalStateException(
                        "LLM thiếu tiêu chí " + criterion.code() + " trong kết quả chấm");
            }

            AcousticOverride acoustic = acousticOverride(criterion, request.acousticMetrics());
            double score = acoustic == null
                    ? clamp(requiredScore(node, criterion.code()), criterion.maxScore(), criterion.code())
                    : acoustic.score();
            String criterionFeedback = limitedText(node.path("feedback"), 2_000);
            if (criterionFeedback == null) {
                criterionFeedback = "AI chưa cung cấp nhận xét chi tiết cho tiêu chí này.";
            }
            scores.add(new CriterionScore(
                    criterion.code(),
                    criterion.name(),
                    score,
                    criterion.maxScore(),
                    acoustic == null ? criterionFeedback : acoustic.feedback()));

            total += score;
            max += criterion.maxScore();
        }

        double percentage = max > 0 ? total / max * 100 : 0;
        String modelLevel = cefr(json.path("cefrLevel").asText(null));
        String level = request.type() == EvaluationType.SPEAKING_AI
                && request.acousticMetrics() != null && !request.acousticMetrics().isEmpty()
                ? cefrFromPercentage(percentage)
                : modelLevel == null ? cefrFromPercentage(percentage) : modelLevel;
        String summary = limitedText(json.path("summary"), 3_000);
        if (summary == null) {
            summary = "Bài làm đạt %.0f%% tổng điểm theo rubric.".formatted(percentage);
        }
        Feedback feedback = new Feedback(
                summary,
                stringList(json.path("strengths"), 10, 1_000),
                stringList(json.path("weaknesses"), 10, 1_000),
                stringList(json.path("suggestions"), 10, 1_000),
                limitedText(json.path("correctedVersion"), 20_000));
        if (request.type() == EvaluationType.SPEAKING_AI
                && request.acousticMetrics() != null && !request.acousticMetrics().isEmpty()) {
            feedback = sanitizeSpeakingFeedback(feedback);
        }
        return new EvaluationResult(
                scores,
                round(total),
                round(max),
                level,
                feedback);
    }

    private static double requiredScore(JsonNode criterion, String code) {
        JsonNode score = criterion.get("score");
        if (score == null || score.isNull() || (!score.isNumber() && !score.isTextual())) {
            throw new IllegalStateException("Tiêu chí " + code + " thiếu score dạng số");
        }
        double value;
        try {
            value = score.isNumber() ? score.doubleValue() : Double.parseDouble(score.asText().trim());
        } catch (NumberFormatException ex) {
            throw new IllegalStateException("Tiêu chí " + code + " có score không phải số", ex);
        }
        if (!Double.isFinite(value)) {
            throw new IllegalStateException("Tiêu chí " + code + " có score không hữu hạn");
        }
        return value;
    }

    /** Removes audio claims the text-only model occasionally emits despite the prompt. */
    private static Feedback sanitizeSpeakingFeedback(Feedback feedback) {
        return new Feedback(
                feedback.summary(),
                withoutAudioClaims(feedback.strengths()),
                withoutAudioClaims(feedback.weaknesses()),
                withoutAudioClaims(feedback.suggestions()),
                feedback.correctedVersion());
    }

    private static List<String> withoutAudioClaims(List<String> values) {
        return values.stream().filter(value -> {
            String folded = Normalizer.normalize(value, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}+", "")
                    .toLowerCase(Locale.ROOT)
                    .replace('đ', 'd');
            return !(folded.contains("phat am")
                    || folded.contains("ngu dieu")
                    || folded.contains("giong")
                    || folded.contains("am thanh")
                    || folded.contains("de nghe")
                    || folded.contains("nguoi nghe")
                    || folded.contains("pronunciation")
                    || folded.contains("intonation")
                    || folded.contains("accent")
                    || folded.contains("stress pattern"));
        }).toList();
    }

    private record AcousticOverride(double score, String feedback) {
    }

    /** Locks audio criteria to locally measured values so the text LLM cannot pretend it heard audio. */
    private static AcousticOverride acousticOverride(
            CriterionSpec criterion, Map<String, Object> metrics) {
        if (metrics == null || metrics.isEmpty()) {
            return null;
        }
        String code = criterion.code().toUpperCase(Locale.ROOT);
        if ("PRONUNCIATION".equals(code)) {
            Double ratio = metric(metrics, "pronunciationClarityEstimate");
            if (ratio == null) return null;
            double score = Math.round(clampRatio(ratio) * criterion.maxScore());
            Double confidence = metric(metrics, "asrConfidence");
            return new AcousticOverride(score,
                    "Độ rõ phát âm ước lượng %.0f%% từ bộ nhận dạng local%s. "
                            .formatted(ratio * 100,
                                    confidence == null ? "" : " (độ tin cậy ASR %.0f%%)".formatted(confidence * 100))
                            + "Đây chưa phải phép đo lỗi phoneme theo từng âm.");
        }
        if ("FLUENCY".equals(code)) {
            Double ratio = metric(metrics, "fluencyEstimate");
            if (ratio == null) return null;
            double score = Math.round(clampRatio(ratio) * criterion.maxScore());
            double wpm = valueOrZero(metric(metrics, "wordsPerMinute"));
            double speechRatio = valueOrZero(metric(metrics, "speechRatio"));
            int longPauses = (int) Math.round(valueOrZero(metric(metrics, "longPauseCount")));
            int fillers = (int) Math.round(valueOrZero(metric(metrics, "fillerCount")));
            return new AcousticOverride(score,
                    "Tốc độ %.0f từ/phút, tỷ lệ thời gian nói %.0f%%, %d khoảng dừng dài và %d từ đệm."
                            .formatted(wpm, speechRatio * 100, longPauses, fillers));
        }
        return null;
    }

    private static Double metric(Map<String, Object> metrics, String key) {
        Object value = metrics.get(key);
        return value instanceof Number number ? number.doubleValue() : null;
    }

    private static double valueOrZero(Double value) {
        return value == null ? 0 : value;
    }

    private static double clampRatio(double value) {
        return Math.max(0, Math.min(1, value));
    }

    private static String cefrFromPercentage(double percentage) {
        if (percentage >= 90) return "C2";
        if (percentage >= 78) return "C1";
        if (percentage >= 62) return "B2";
        if (percentage >= 45) return "B1";
        if (percentage >= 28) return "A2";
        return "A1";
    }

    /** Bài trống: 0 điểm mọi tiêu chí, không gọi API. */
    private EvaluationResult zeroResult(RubricSpec rubric, EvaluationType type) {
        String note = type == EvaluationType.SPEAKING_AI
                ? "Không nhận được nội dung nói."
                : "Không có bài viết.";

        List<CriterionScore> scores = new ArrayList<>();
        double max = 0;
        for (CriterionSpec criterion : rubric.criteria()) {
            scores.add(new CriterionScore(
                    criterion.code(), criterion.name(), 0, criterion.maxScore(), note));
            max += criterion.maxScore();
        }

        return new EvaluationResult(
                // A1 là bậc thấp nhất trong Enums.CefrLevel; không có A0.
                scores, 0, round(max), "A1",
                new Feedback(note, List.of(), List.of(note), List.of("Hãy làm lại bài này."), null));
    }

    /**
     * Điểm phải là số nguyên trong khoảng [0, maxScore].
     *
     * <p>Prompt đã yêu cầu số nguyên nhưng không tin được: mô hình vẫn có lúc
     * trả 1.5. Làm tròn ở đây để không có phần thập phân nào lọt xuống DB rồi
     * hiện lên bảng điểm.
     */
    private static double clamp(double score, double maxScore, String code) {
        if (score < 0) {
            log.warn("LLM chấm {} âm ({}), kẹp về 0", code, score);
            return 0;
        }
        if (score > maxScore) {
            log.warn("LLM chấm {} vượt trần ({} > {}), kẹp về trần", code, score, maxScore);
            return Math.floor(maxScore);
        }
        long rounded = Math.round(score);
        if (rounded != score) {
            log.debug("LLM chấm {} lẻ ({}), làm tròn thành {}", code, score, rounded);
        }
        return rounded;
    }

    private static String cefr(String value) {
        if (value == null) {
            return null;
        }
        String upper = value.trim().toUpperCase(Locale.ROOT);
        return CEFR_LEVELS.contains(upper) ? upper : null;
    }

    private static String text(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String value = node.asText("").trim();
        return value.isEmpty() ? null : value;
    }

    private static String limitedText(JsonNode node, int maxLength) {
        String value = text(node);
        if (value == null || value.length() <= maxLength) return value;
        log.warn("LLM trả text dài {}, cắt còn {} ký tự", value.length(), maxLength);
        return value.substring(0, maxLength);
    }

    private static List<String> stringList(JsonNode node, int maxItems, int maxItemLength) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        node.forEach(child -> {
            if (values.size() >= maxItems) return;
            String value = limitedText(child, maxItemLength);
            if (value != null) {
                values.add(value);
            }
        });
        return values;
    }

    /** Làm tròn 2 chữ số: rubric có mức lẻ như 1.25 nên không dùng số nguyên. */
    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static String trimNumber(double value) {
        return value == Math.floor(value)
                ? String.valueOf((long) value)
                : String.valueOf(value);
    }

    private static String abbreviate(String value) {
        if (value == null) {
            return "";
        }
        return value.length() <= 500 ? value : value.substring(0, 500) + "…";
    }

    private static String safeMessage(Throwable error) {
        if (error == null || error.getMessage() == null || error.getMessage().isBlank()) {
            return "Lỗi không rõ";
        }
        return abbreviate(error.getMessage().replaceAll("[\\r\\n]+", " "));
    }
}
