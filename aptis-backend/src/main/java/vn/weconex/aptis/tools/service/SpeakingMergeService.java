package vn.weconex.aptis.tools.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocumentRepository;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.evaluation.service.LlmProviderPool;
import vn.weconex.aptis.tools.domain.AiMergedAnswer;
import vn.weconex.aptis.tools.repository.AiMergedAnswerRepository;
import vn.weconex.aptis.tools.repository.SpeakingPart4Repository;

/**
 * Gộp 2–3 đề Speaking Part 4 thành một bài trả lời dùng chung.
 *
 * <p>Part 4 hỏi ba câu nối nhau về một trải nghiệm và một quan điểm. Nhiều đề
 * khác chủ đề nhưng chung một "khung ý" (một lần được giúp đỡ, một lần thử thứ
 * mới…), nên chuẩn bị một câu chuyện là trả lời được cả nhóm. AI làm việc tìm
 * khung ý đó thay học viên.
 *
 * <p>Dùng lại pool LLM đang chấm Writing/Speaking, không thêm key mới. Pool là
 * bean có điều kiện nên lấy qua ObjectProvider: AI tắt thì trang vẫn mở được,
 * chỉ nút Gộp báo tạm ngưng.
 */
@Slf4j
@Service
public class SpeakingMergeService {

    /** Theo quyết định 26/09/2026. */
    public static final int DAILY_LIMIT = 5;
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final String SYSTEM_PROMPT = """
            You coach Vietnamese learners for Aptis Speaking Part 4. The learner gets 1 minute
            to prepare and speaks for 2 minutes answering three connected questions about a
            personal experience and an opinion.

            Several Part 4 topics can be answered with ONE story if you pick the right common
            idea. Given 2-3 topics, find that shared idea and write one answer that works for
            all of them with small changes.

            Rules:
            - The model answer is natural spoken English at B2 level, about 220-260 words
              (2 minutes), first person, one concrete story with details, then an opinion.
            - Keep it realistic for a Vietnamese learner (school, work, family, travel).
            - Explanations are in Vietnamese, short and practical.
            - For every topic, give the exact sentences to swap so the answer fits that
              topic's three questions.

            Reply with raw JSON only:
            {"commonIdea":"<Vietnamese: the shared idea in one sentence>",
             "why":"<Vietnamese: why this idea fits all topics, 1-2 sentences>",
             "outline":["<Vietnamese: step of the answer>"],
             "modelAnswer":"<English model answer>",
             "adaptations":[{"topicId":"<id>","topic":"<title>",
               "changes":["<Vietnamese instruction + the English sentence to use>"]}],
             "usefulPhrases":["<English phrase> — <Vietnamese meaning>"]}
            """;

    private final AiMergedAnswerRepository mergedRepository;
    private final SpeakingPart4Repository part4Repository;
    private final QuestionSetDocumentRepository documentRepository;
    private final EntitlementService entitlementService;
    private final ObjectProvider<LlmProviderPool> providerPool;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public SpeakingMergeService(
            AiMergedAnswerRepository mergedRepository,
            SpeakingPart4Repository part4Repository,
            QuestionSetDocumentRepository documentRepository,
            EntitlementService entitlementService,
            ObjectProvider<LlmProviderPool> providerPool,
            ObjectMapper objectMapper) {
        this.mergedRepository = mergedRepository;
        this.part4Repository = part4Repository;
        this.documentRepository = documentRepository;
        this.entitlementService = entitlementService;
        this.providerPool = providerPool;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        // Viết một bài 2 phút kèm phân tích mất khoảng 20–40 giây với model nhỏ.
        factory.setReadTimeout((int) Duration.ofSeconds(90).toMillis());
        this.restTemplate = new RestTemplate(factory);
    }

    public record Part4Set(String id, String title, List<String> questions) {}

    public record Quota(int limit, int used, int remaining) {}

    @Transactional(readOnly = true)
    public List<Part4Set> sets() {
        Map<String, Integer> revisions = new LinkedHashMap<>();
        Map<String, String> titles = new LinkedHashMap<>();
        for (Object[] row : part4Repository.publishedSets()) {
            revisions.put((String) row[0], ((Number) row[1]).intValue());
            titles.put((String) row[0], (String) row[2]);
        }
        Map<String, QuestionSetDocument> docs = currentDocuments(revisions);
        List<Part4Set> result = new ArrayList<>();
        for (String id : revisions.keySet()) {
            QuestionSetDocument doc = docs.get(id);
            if (doc == null) continue;
            List<String> questions = questionsOf(doc);
            if (questions.isEmpty()) continue;
            String title = titles.get(id) != null && !titles.get(id).isBlank() ? titles.get(id) : doc.getTitle();
            result.add(new Part4Set(id, title, questions));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Quota quota(String userId) {
        long used = mergedRepository.countByUserIdAndCreatedAtAfter(userId, startOfToday());
        return new Quota(DAILY_LIMIT, (int) used, (int) Math.max(0, DAILY_LIMIT - used));
    }

    @Transactional(readOnly = true)
    public List<AiMergedAnswer> history(String userId) {
        return mergedRepository.findTop20ByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Gộp một nhóm đề.
     *
     * <p>Nhóm đã gộp rồi thì trả kết quả cũ và không trừ lượt: học viên bấm lại
     * cùng nhóm thường là muốn xem lại, không phải muốn một bài khác.
     */
    @Transactional
    public AiMergedAnswer merge(String userId, List<String> questionSetIds) {
        if (!entitlementService.hasPremiumAccess(userId)) {
            throw ApiException.premiumRequired();
        }
        List<String> ids = questionSetIds == null ? List.of()
                : questionSetIds.stream().filter(s -> s != null && !s.isBlank()).distinct().sorted().toList();
        if (ids.size() < 2 || ids.size() > 3) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Chọn từ 2 đến 3 đề để gộp");
        }
        String key = String.join(",", ids);
        var cached = mergedRepository.findByUserIdAndSetKey(userId, key);
        if (cached.isPresent()) {
            return cached.get();
        }
        if (quota(userId).remaining() <= 0) {
            throw new ApiException(ErrorCode.RATE_LIMITED,
                    "Bạn đã dùng hết " + DAILY_LIMIT + " lượt gộp đề hôm nay. Lượt mới mở lại lúc 00:00.");
        }

        Map<String, Part4Set> byId = new LinkedHashMap<>();
        for (Part4Set set : sets()) byId.put(set.id(), set);
        List<Part4Set> chosen = ids.stream().map(byId::get).toList();
        if (chosen.stream().anyMatch(Objects::isNull)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Có đề không còn trong ngân hàng, hãy chọn lại");
        }

        LlmProviderPool pool = providerPool.getIfAvailable();
        if (pool == null || pool.isEmpty()) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, "Công cụ AI đang tạm tắt, hãy thử lại sau");
        }

        JsonNode result;
        String model;
        try (LlmProviderPool.Lease lease = pool.acquire()) {
            if (lease == null) {
                throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, "AI đang bận, hãy thử lại sau ít phút");
            }
            try {
                result = call(lease.provider(), chosen);
                model = lease.provider().model();
                lease.markSuccess();
            } catch (RuntimeException ex) {
                lease.markFailure();
                log.warn("Gộp đề Speaking Part 4 thất bại: {}", ex.getMessage());
                throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, "AI chưa trả được kết quả, hãy thử lại");
            }
        }

        AiMergedAnswer saved = new AiMergedAnswer();
        saved.setUserId(userId);
        saved.setSetKey(key);
        saved.setModel(model);
        try {
            saved.setQuestionSetIds(objectMapper.writeValueAsString(ids));
            saved.setResult(objectMapper.writeValueAsString(result));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
        return mergedRepository.save(saved);
    }

    private JsonNode call(LlmProviderPool.Provider provider, List<Part4Set> sets) {
        StringBuilder topics = new StringBuilder();
        for (int i = 0; i < sets.size(); i++) {
            Part4Set set = sets.get(i);
            topics.append("Topic ").append(i + 1).append(" (id ").append(set.id()).append("): ")
                    .append(set.title()).append('\n');
            for (String q : set.questions()) topics.append("  - ").append(q).append('\n');
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", provider.model());
        body.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", topics.toString())));
        body.put("temperature", 0.4);
        body.put("max_tokens", 2500);
        body.put("response_format", Map.of("type", "json_object"));
        body.put("stream", false);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (!provider.apiKey().isBlank()) headers.setBearerAuth(provider.apiKey());

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                chatUrl(provider.baseUrl()), HttpMethod.POST, new HttpEntity<>(body, headers), JsonNode.class);
        String content = response.getBody() == null ? null
                : response.getBody().path("choices").path(0).path("message").path("content").asText(null);
        if (content == null || content.isBlank()) {
            throw new IllegalStateException("Model trả nội dung rỗng");
        }
        JsonNode parsed;
        try {
            parsed = objectMapper.readTree(stripFence(content));
        } catch (Exception ex) {
            throw new IllegalStateException("Kết quả AI không phải JSON hợp lệ", ex);
        }
        if (!parsed.hasNonNull("modelAnswer")) {
            throw new IllegalStateException("Kết quả AI thiếu bài mẫu");
        }
        return parsed;
    }

    private Map<String, QuestionSetDocument> currentDocuments(Map<String, Integer> revisions) {
        Map<String, QuestionSetDocument> out = new LinkedHashMap<>();
        if (revisions.isEmpty()) return out;
        for (QuestionSetDocument doc : documentRepository.findByQuestionSetIdIn(new ArrayList<>(revisions.keySet()))) {
            Integer rev = revisions.get(doc.getQuestionSetId());
            if (rev != null && doc.getRevision() == rev) out.put(doc.getQuestionSetId(), doc);
        }
        return out;
    }

    /**
     * Ba câu hỏi của đề. Dữ liệu nhập vào có hai kiểu: ba item riêng, hoặc một
     * item chứa cả ba câu đánh số "1. … 2. … 3. …" — tách cả hai về một dạng.
     */
    static List<String> questionsOf(QuestionSetDocument doc) {
        List<String> out = new ArrayList<>();
        for (QuestionSetDocument.Item item : doc.getItems()) {
            if (item.getPrompt() == null || item.getPrompt().getValue() == null) continue;
            out.addAll(splitQuestions(item.getPrompt().getValue()));
        }
        return out;
    }

    static List<String> splitQuestions(String raw) {
        String text = raw.replaceAll("<[^>]+>", "\n").replace("&nbsp;", " ");
        List<String> out = new ArrayList<>();
        for (String line : text.split("\\r?\\n|\\s(?=\\d[.)]\\s)")) {
            String clean = line.replaceFirst("^\\s*\\d+[.)]\\s*", "").replaceAll("\\s+", " ").trim();
            if (!clean.isEmpty()) out.add(clean);
        }
        return out;
    }

    private static String chatUrl(String baseUrl) {
        String url = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return url.endsWith("/v1") ? url + "/chat/completions" : url;
    }

    private static String stripFence(String raw) {
        String v = raw.strip();
        if (v.startsWith("```")) {
            int nl = v.indexOf('\n');
            v = nl > 0 ? v.substring(nl + 1) : v;
            int end = v.lastIndexOf("```");
            if (end >= 0) v = v.substring(0, end);
        }
        return v.strip();
    }

    private static Instant startOfToday() {
        return LocalDate.now(VN).atStartOfDay(VN).toInstant();
    }
}
