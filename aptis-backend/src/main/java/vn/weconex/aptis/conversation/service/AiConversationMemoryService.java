package vn.weconex.aptis.conversation.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.conversation.domain.AiConversationProfile;
import vn.weconex.aptis.conversation.domain.AiConversationTurn;
import vn.weconex.aptis.conversation.repository.AiConversationProfileRepository;
import vn.weconex.aptis.conversation.repository.AiConversationTurnRepository;

/**
 * Bộ nhớ của phòng AI Voice.
 *
 * <p>Ba tầng, vì mỗi tầng giải quyết một kiểu quên khác nhau:
 * <ol>
 *   <li>Lượt nói ghi ngay — đóng tab đột ngột không mất ngữ cảnh;</li>
 *   <li>Tóm tắt phiên bằng LLM — phiên mới biết vừa nói những gì;</li>
 *   <li>Hồ sơ dài hạn — hôm sau quay lại vẫn nhớ tên và chuyện cũ.</li>
 * </ol>
 *
 * <p>Tóm tắt gọi Gemini text (rẻ hơn Live rất nhiều) thay vì nhét nguyên
 * transcript vào phiên mới: transcript thô tốn token, loãng, và càng nói lâu
 * càng vượt cửa sổ ngữ cảnh.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiConversationMemoryService {

    /** Số lượt gần nhất đưa vào tóm tắt. Đủ để bắt mạch câu chuyện, không quá dài. */
    private static final int TURNS_FOR_SUMMARY = 60;

    /** Số lượt thô kèm theo tóm tắt, để AI nối tiếp đúng câu đang dở. */
    private static final int RECENT_TURNS_IN_CONTEXT = 8;

    private static final String SUMMARY_MODEL = "gemini-2.0-flash";
    private static final URI GENERATE_URI = URI.create(
            "https://generativelanguage.googleapis.com/v1beta/models/"
                    + SUMMARY_MODEL + ":generateContent");

    private final AiConversationTurnRepository turnRepository;
    private final AiConversationProfileRepository profileRepository;
    private final GeminiProviderPool providerPool;
    private final ObjectMapper objectMapper;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10)).build();

    /**
     * Ghi các lượt nói mới của một phiên.
     *
     * <p>Client gửi kèm seq nên gửi lại trùng cũng không nhân đôi: ràng buộc
     * duy nhất (session_id, seq) chặn, và ta bỏ qua lượt đã có thay vì báo lỗi —
     * mạng chập chờn khiến client gửi lại là chuyện bình thường.
     */
    @Transactional
    public int appendTurns(String userId, String sessionId, List<TurnInput> turns) {
        if (turns == null || turns.isEmpty()) {
            return 0;
        }
        // Client đánh seq theo transcript trên màn hình, vốn chạy liên tục qua
        // nhiều phiên khi bị chuyển giao. Ở đây đánh lại theo số lượt đã có của
        // chính phiên này, để seq luôn liền từ 0 và ràng buộc duy nhất
        // (session_id, seq) chặn được lô gửi trùng.
        int next = (int) turnRepository.countBySessionId(sessionId);
        List<AiConversationTurn> toSave = new ArrayList<>();
        for (TurnInput input : turns) {
            if (input == null || input.content() == null || input.content().isBlank()) {
                continue;
            }
            AiConversationTurn turn = new AiConversationTurn();
            turn.setSessionId(sessionId);
            turn.setUserId(userId);
            turn.setRole("ai".equals(input.role()) ? "ai" : "user");
            turn.setContent(input.content().length() > 8_000
                    ? input.content().substring(0, 8_000) : input.content());
            turn.setSeq(next++);
            toSave.add(turn);
        }
        if (toSave.isEmpty()) {
            return 0;
        }
        turnRepository.saveAll(toSave);
        return toSave.size();
    }

    /**
     * Ngữ cảnh đưa vào phiên mới.
     *
     * <p>Ưu tiên hồ sơ dài hạn + tóm tắt, rồi mới tới vài lượt thô gần nhất.
     * Trả về chuỗi rỗng khi chưa có gì để nhớ, lúc đó prompt tự hiểu là hội
     * thoại mới.
     */
    @Transactional(readOnly = true)
    public String buildContext(String userId, String previousSummary) {
        Map<String, Object> context = new LinkedHashMap<>();

        profileRepository.findById(userId).ifPresent(profile -> {
            putJsonIfPresent(context, "known_facts", profile.getFacts());
            putJsonIfPresent(context, "style_preferences", profile.getStylePrefs());
            if (profile.getLastSummary() != null && !profile.getLastSummary().isBlank()) {
                context.put("previous_sessions_summary", profile.getLastSummary());
            }
            context.put("total_sessions", profile.getTotalSessions());
        });

        if (previousSummary != null && !previousSummary.isBlank()) {
            context.put("last_session_summary", previousSummary);
        }

        List<AiConversationTurn> recent =
                turnRepository.findRecentByUser(userId, Limit.of(RECENT_TURNS_IN_CONTEXT));
        if (!recent.isEmpty()) {
            List<Map<String, String>> lines = new ArrayList<>();
            // findRecentByUser trả mới trước; đảo lại để đọc xuôi theo thời gian.
            for (int i = recent.size() - 1; i >= 0; i--) {
                AiConversationTurn turn = recent.get(i);
                lines.add(Map.of("role", turn.getRole(), "text", turn.getContent()));
            }
            context.put("recent_conversation", lines);
        }

        if (context.isEmpty()) {
            return "";
        }
        try {
            return objectMapper.writeValueAsString(context);
        } catch (Exception ex) {
            log.warn("Không dựng được ngữ cảnh AI Voice cho user {}", userId, ex);
            return "";
        }
    }

    /**
     * Tóm tắt phiên vừa kết thúc và cập nhật hồ sơ dài hạn.
     *
     * <p>Không ném lỗi ra ngoài: mất tóm tắt chỉ làm AI nhớ kém hơn, không đáng
     * để chặn việc đóng phiên hay tạo phiên mới.
     */
    @Transactional
    public void summariseSession(String userId, String sessionId) {
        List<AiConversationTurn> turns = turnRepository.findBySessionIdOrderBySeqAsc(sessionId);
        if (turns.isEmpty()) {
            return;
        }
        List<AiConversationTurn> window = turns.size() > TURNS_FOR_SUMMARY
                ? turns.subList(turns.size() - TURNS_FOR_SUMMARY, turns.size())
                : turns;

        AiConversationProfile profile = profileRepository.findById(userId)
                .orElseGet(() -> {
                    AiConversationProfile fresh = new AiConversationProfile();
                    fresh.setUserId(userId);
                    fresh.setCreatedAt(Instant.now());
                    fresh.setTotalSessions(0);
                    return fresh;
                });

        JsonNode summary = callSummaryModel(window, profile);
        if (summary != null) {
            writeJson(summary.path("facts")).ifPresent(profile::setFacts);
            writeJson(summary.path("style_preferences")).ifPresent(profile::setStylePrefs);
            String text = summary.path("summary").asText(null);
            if (text != null && !text.isBlank()) {
                profile.setLastSummary(text.length() > 4_000 ? text.substring(0, 4_000) : text);
            }
        }
        profile.setTotalSessions(profile.getTotalSessions() + 1);
        profile.setLastSessionAt(Instant.now());
        profile.setUpdatedAt(Instant.now());
        profileRepository.save(profile);
    }

    /** Gọi Gemini text để tóm tắt. Trả null nếu hỏng — caller vẫn chạy tiếp. */
    private JsonNode callSummaryModel(List<AiConversationTurn> turns, AiConversationProfile profile) {
        StringBuilder conversation = new StringBuilder();
        for (AiConversationTurn turn : turns) {
            conversation.append("ai".equals(turn.getRole()) ? "Friend: " : "Learner: ")
                    .append(turn.getContent()).append('\n');
        }

        String existingFacts = profile.getFacts() == null ? "{}" : profile.getFacts();
        String prompt = """
                You maintain the long-term memory of an English speaking-practice buddy.

                Merge what you already know with this new conversation. Keep facts that
                are still true, add new ones, drop anything the learner corrected.

                Known facts so far (JSON):
                %s

                New conversation:
                %s

                Reply with raw JSON only, no markdown fence:
                {"summary":"<2-4 sentences in English: what they talked about, where the \
                conversation left off, anything worth bringing up next time>",
                 "facts":{"name":"<if mentioned>","job":"<if mentioned>",\
                "interests":["..."],"recurring_mistakes":["..."],"open_threads":["..."]},
                 "style_preferences":{"address":"<tui-ban|tao-may|unset>",\
                "teasing":"<on|off|unset>","english_only":<true|false|null>,\
                "corrections":"<on|off|unset>"}}

                Omit any field the conversation gives no evidence for. Never invent details.
                """.formatted(existingFacts, conversation);

        try {
            var credential = providerPool.acquire();
            Map<String, Object> body = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                    "generationConfig", Map.of("temperature", 0.2, "responseMimeType", "application/json"));

            HttpRequest request = HttpRequest.newBuilder(GENERATE_URI)
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", credential.apiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("Tóm tắt AI Voice thất bại, HTTP {}", response.statusCode());
                return null;
            }
            String text = objectMapper.readTree(response.body())
                    .path("candidates").path(0).path("content").path("parts").path(0)
                    .path("text").asText(null);
            if (text == null || text.isBlank()) {
                return null;
            }
            return objectMapper.readTree(stripFence(text));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception ex) {
            // Tóm tắt hỏng thì AI nhớ kém hơn, không phải lý do để chặn phiên mới.
            log.warn("Không tóm tắt được phiên AI Voice: {}", ex.getMessage());
            return null;
        }
    }

    /** Model thỉnh thoảng vẫn bọc JSON trong ```json dù đã yêu cầu raw. */
    private static String stripFence(String raw) {
        String value = raw.strip();
        if (value.startsWith("```")) {
            int firstBreak = value.indexOf('\n');
            if (firstBreak > 0) {
                value = value.substring(firstBreak + 1);
            }
            int fence = value.lastIndexOf("```");
            if (fence >= 0) {
                value = value.substring(0, fence);
            }
        }
        return value.strip();
    }

    private void putJsonIfPresent(Map<String, Object> target, String key, String json) {
        if (json == null || json.isBlank()) {
            return;
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isEmpty()) {
                target.put(key, node);
            }
        } catch (Exception ex) {
            log.debug("Bỏ qua {} không đọc được", key);
        }
    }

    private java.util.Optional<String> writeJson(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || node.isEmpty()) {
            return java.util.Optional.empty();
        }
        try {
            return java.util.Optional.of(objectMapper.writeValueAsString(node));
        } catch (Exception ex) {
            return java.util.Optional.empty();
        }
    }

    /** Một lượt nói do client gửi lên. */
    public record TurnInput(String role, String content, int seq) {}
}
