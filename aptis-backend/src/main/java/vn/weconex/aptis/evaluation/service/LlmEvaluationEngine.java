package vn.weconex.aptis.evaluation.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
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

    private static final ObjectMapper MAPPER = new ObjectMapper();

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
        String answer = request.type() == EvaluationType.SPEAKING_AI
                ? request.transcript()
                : request.textResponse();

        // Bài trống vẫn phải ra kết quả 0 điểm, không gọi API cho tốn lượt.
        if (answer == null || answer.isBlank()) {
            return zeroResult(request.rubric(), request.type());
        }

        JsonNode parsed = callModel(buildSystemPrompt(request), buildUserPrompt(request, answer));
        return toResult(parsed, request.rubric());
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

                Reply with raw JSON only — no markdown fence, no commentary:
                {"criteria":[{"code":"<criterion code>","score":<number>,\
                "feedback":"<Vietnamese, one or two sentences>"}],
                 "cefrLevel":"<A1|A2|B1|B2|C1|C2>",
                 "summary":"<Vietnamese, one or two sentences>",
                 "strengths":["<Vietnamese>"],
                 "weaknesses":["<Vietnamese>"],
                 "suggestions":["<Vietnamese>"],
                 "correctedVersion":"<improved version of the learner's answer, same language as the answer>"}
                """.formatted(skill, criteria);
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

        String content = extractContent(response);
        try {
            return MAPPER.readTree(stripCodeFence(content));
        } catch (Exception ex) {
            // Ghi nguyên văn để chẩn đoán khi mô hình trả sai định dạng
            log.error("LLM trả về không phải JSON hợp lệ: {}", abbreviate(content));
            throw new IllegalStateException("LLM trả về không phải JSON: " + ex.getMessage(), ex);
        }
    }

    /** Ghép đường dẫn giống law-app: base kết thúc /v1 thì nối /chat/completions. */
    private String chatCompletionsUrl() {
        String url = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return url.endsWith("/v1") ? url + "/chat/completions" : url;
    }

    @SuppressWarnings("unchecked")
    private static String extractContent(ResponseEntity<Map> response) {
        Map<String, Object> body = response.getBody();
        if (body == null) {
            throw new IllegalStateException("LLM trả về body rỗng");
        }
        List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("LLM trả về không có choices: " + abbreviate(body.toString()));
        }
        Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
        Object content = message == null ? null : message.get("content");
        if (content == null) {
            throw new IllegalStateException("LLM trả về thiếu message.content");
        }
        return content.toString();
    }

    /** Mô hình hay bọc JSON trong ```json … ``` dù đã dặn không. */
    private static String stripCodeFence(String raw) {
        String text = raw.trim();
        if (!text.startsWith("```")) {
            return text;
        }
        int firstBreak = text.indexOf('\n');
        int lastFence = text.lastIndexOf("```");
        if (firstBreak < 0 || lastFence <= firstBreak) {
            return text;
        }
        return text.substring(firstBreak + 1, lastFence).trim();
    }

    // -----------------------------------------------------------------
    // Chuyển đổi và kiểm tra
    // -----------------------------------------------------------------

    private EvaluationResult toResult(JsonNode json, RubricSpec rubric) {
        JsonNode criteriaNode = json.path("criteria");
        if (!criteriaNode.isArray()) {
            throw new IllegalStateException("LLM trả về thiếu mảng criteria");
        }

        Map<String, JsonNode> byCode = new LinkedHashMap<>();
        criteriaNode.forEach(node -> {
            String code = node.path("code").asText(null);
            if (code != null) {
                byCode.put(code.trim().toUpperCase(), node);
            }
        });

        List<CriterionScore> scores = new ArrayList<>();
        double total = 0;
        double max = 0;

        // Duyệt theo rubric chứ không theo thứ tự mô hình trả về: thiếu tiêu chí
        // nào là hỏng, thừa tiêu chí lạ thì bỏ qua.
        for (CriterionSpec criterion : rubric.criteria()) {
            JsonNode node = byCode.get(criterion.code().toUpperCase());
            if (node == null) {
                throw new IllegalStateException(
                        "LLM thiếu tiêu chí " + criterion.code() + " trong kết quả chấm");
            }

            double score = clamp(node.path("score").asDouble(0), criterion.maxScore(), criterion.code());
            scores.add(new CriterionScore(
                    criterion.code(),
                    criterion.name(),
                    score,
                    criterion.maxScore(),
                    text(node.path("feedback"))));

            total += score;
            max += criterion.maxScore();
        }

        return new EvaluationResult(
                scores,
                round(total),
                round(max),
                cefr(json.path("cefrLevel").asText(null)),
                new Feedback(
                        text(json.path("summary")),
                        stringList(json.path("strengths")),
                        stringList(json.path("weaknesses")),
                        stringList(json.path("suggestions")),
                        text(json.path("correctedVersion"))));
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
        String upper = value.trim().toUpperCase();
        return CEFR_LEVELS.contains(upper) ? upper : null;
    }

    private static String text(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String value = node.asText("").trim();
        return value.isEmpty() ? null : value;
    }

    private static List<String> stringList(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        node.forEach(child -> {
            String value = child.asText("").trim();
            if (!value.isEmpty()) {
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
}
