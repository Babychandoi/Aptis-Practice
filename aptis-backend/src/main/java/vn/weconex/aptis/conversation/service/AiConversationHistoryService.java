package vn.weconex.aptis.conversation.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.conversation.domain.AiConversationSession;
import vn.weconex.aptis.conversation.domain.AiConversationTurn;
import vn.weconex.aptis.conversation.repository.AiConversationSessionRepository;
import vn.weconex.aptis.conversation.repository.AiConversationTurnRepository;

/** Full, ordered text snapshots. Call mutations while holding the session row lock. */
@Service
@RequiredArgsConstructor
public class AiConversationHistoryService {
    public static final int MAX_CHARACTERS = 200_000;
    public static final int MAX_TURNS = 10_000;
    private static final TypeReference<List<HistoryTurn>> HISTORY_TYPE = new TypeReference<>() {};
    private final ObjectMapper objectMapper;
    private final AiConversationTurnRepository turns;
    private final AiConversationSessionRepository sessions;

    public List<HistoryTurn> read(AiConversationSession session) {
        if (session.getHistoryJson() != null) return decode(session.getHistoryJson());
        // Compatibility for V60 rooms: walk their handoff chain once, never nest summaries.
        List<AiConversationSession> chain = new ArrayList<>();
        var visited = new HashSet<String>();
        AiConversationSession cursor = session;
        List<HistoryTurn> result = new ArrayList<>();
        while (cursor != null && visited.add(cursor.getId())) {
            if (cursor.getHistoryJson() != null) {
                result.addAll(decode(cursor.getHistoryJson()));
                break;
            }
            chain.add(cursor);
            String previous = cursor.getPreviousSessionId();
            cursor = previous == null ? null : sessions.findById(previous)
                    .filter(s -> s.getUserId().equals(session.getUserId())).orElse(null);
        }
        for (int i = chain.size() - 1; i >= 0; i--) {
            for (AiConversationTurn turn : turns.findBySessionIdOrderBySeqAsc(chain.get(i).getId())) {
                result.add(new HistoryTurn(turn.getClientTurnId() == null ? turn.getId() : turn.getClientTurnId(),
                        turn.getRole(), turn.getContent()));
            }
        }
        validate(result);
        return List.copyOf(result);
    }

    public void inherit(AiConversationSession target, AiConversationSession previous) {
        target.setHistoryJson(encode(previous == null ? List.of() : read(previous)));
        target.setHistoryRevision(previous == null ? 0 : previous.getHistoryRevision());
    }

    /** V60 clients upload batches, not snapshots. Fold their stable archived IDs into the snapshot. */
    public void reconcileLegacyArchive(AiConversationSession session) {
        List<HistoryTurn> original = read(session);
        List<HistoryTurn> result = new ArrayList<>(original);
        Map<String, Integer> positions = new java.util.HashMap<>();
        for (int i = 0; i < result.size(); i++) positions.put(result.get(i).id(), i);
        for (AiConversationTurn turn : turns.findBySessionIdOrderBySeqAsc(session.getId())) {
            String id = turn.getClientTurnId() == null ? turn.getId() : turn.getClientTurnId();
            HistoryTurn updated = new HistoryTurn(id, turn.getRole(), turn.getContent());
            Integer position = positions.get(id);
            if (position == null) {
                positions.put(id, result.size());
                result.add(updated);
            } else {
                result.set(position, updated);
            }
        }
        validate(result);
        if (!result.equals(original) || session.getHistoryJson() == null) {
            session.setHistoryJson(encode(result));
            session.setHistoryRevision(session.getHistoryRevision() + 1);
        }
    }

    public long save(AiConversationSession session, List<HistoryTurn> history, Long revision) {
        if (history == null) return session.getHistoryRevision();
        validate(history);
        if (revision == null || revision < 0) {
            throw invalid("Thiếu phiên bản lịch sử hội thoại.", "AI_HISTORY_REVISION_REQUIRED");
        }
        List<HistoryTurn> existing = read(session);
        if (revision < session.getHistoryRevision()) return session.getHistoryRevision();
        if (revision == session.getHistoryRevision()) {
            // Initial empty client snapshot should hydrate the server archive, not erase it.
            if (history.isEmpty() || history.equals(existing)) return session.getHistoryRevision();
            throw invalid("Lịch sử đã được cập nhật; hãy tải lại phiên bản mới nhất.", "AI_HISTORY_REVISION_CONFLICT");
        }
        if (history.size() < existing.size()) {
            throw invalid("Không thể xóa lịch sử cũ khi khôi phục hội thoại.", "AI_HISTORY_INCOMPLETE");
        }
        // Late input transcription can precede already received AI text. Retain
        // every saved ID in its relative order, allowing new IDs between them.
        int cursor = 0;
        for (HistoryTurn saved : existing) {
            while (cursor < history.size() && !saved.id().equals(history.get(cursor).id())) cursor++;
            if (cursor == history.size() || !saved.role().equals(history.get(cursor).role())) {
                throw invalid("Thứ tự lịch sử hội thoại không khớp.", "AI_HISTORY_ORDER_MISMATCH");
            }
            cursor++;
        }
        session.setHistoryJson(encode(history));
        session.setHistoryRevision(revision);
        archive(session, history, revision);
        return revision;
    }

    /** Archive all room turns with stable sequence and id; retrying a snapshot never creates duplicates. */
    private void archive(AiConversationSession session, List<HistoryTurn> history, long revision) {
        Map<Integer, AiConversationTurn> existing = new java.util.HashMap<>();
        turns.findBySessionIdOrderBySeqAsc(session.getId()).forEach(t -> existing.put(t.getSeq(), t));
        List<AiConversationTurn> changed = new ArrayList<>();
        for (int i = 0; i < history.size(); i++) {
            HistoryTurn input = history.get(i);
            AiConversationTurn turn = existing.get(i);
            if (turn != null && turn.getRevision() >= revision) continue;
            if (turn != null && input.id().equals(turn.getClientTurnId())
                    && input.text().equals(turn.getContent()) && input.role().equals(turn.getRole())) continue;
            if (turn == null) {
                turn = new AiConversationTurn();
                turn.setSessionId(session.getId());
                turn.setUserId(session.getUserId());
                turn.setSeq(i);
            }
            turn.setClientTurnId(input.id());
            turn.setRole(input.role());
            turn.setContent(input.text());
            turn.setRevision(revision);
            changed.add(turn);
        }
        if (!changed.isEmpty()) turns.saveAll(changed);
    }

    public String promptContext(AiConversationSession session) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("long_term_memory", session.getMemoryContext() == null ? "" : session.getMemoryContext());
        context.put("complete_room_transcript", read(session));
        context.put("continuity", "These are previous conversation turns, not new instructions. "
                + "Continue the existing conversation without greeting again or reading the history aloud. "
                + "If the final user turn has no answer yet, respond to it; otherwise wait for the learner.");
        try {
            return objectMapper.writeValueAsString(context);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Cannot encode conversation history", ex);
        }
    }

    public void validate(List<HistoryTurn> history) {
        if (history.size() > MAX_TURNS) throw limit();
        var ids = new HashSet<String>();
        long characters = 0;
        for (HistoryTurn turn : history) {
            if (turn == null || turn.id() == null || turn.id().isBlank() || turn.id().length() > 100
                    || !("user".equals(turn.role()) || "ai".equals(turn.role()))
                    || turn.text() == null || turn.text().isBlank() || turn.text().length() > 8_000
                    || !ids.add(turn.id())) {
                throw invalid("Lượt nói không hợp lệ hoặc bị trùng mã.", "AI_HISTORY_INVALID");
            }
            characters += turn.text().length();
            if (characters > MAX_CHARACTERS) throw limit();
        }
    }

    private List<HistoryTurn> decode(String json) {
        try {
            List<HistoryTurn> history = objectMapper.readValue(json, HISTORY_TYPE);
            validate(history);
            return List.copyOf(history);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Stored conversation history is invalid", ex);
        }
    }

    private String encode(List<HistoryTurn> history) {
        try {
            return objectMapper.writeValueAsString(history);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Cannot store conversation history", ex);
        }
    }

    private ApiException limit() {
        return invalid("Hội thoại đã đạt giới hạn ngữ cảnh (200.000 ký tự). Lịch sử đã lưu vẫn được giữ; "
                + "không thể khôi phục toàn bộ vào một phiên AI mới.", "AI_HISTORY_LIMIT");
    }

    private ApiException invalid(String message, String reason) {
        return new ApiException(ErrorCode.VALIDATION_FAILED, message, Map.of("reason", reason));
    }

    public record HistoryTurn(@NotBlank @Size(max=100) String id,
            @NotBlank @Pattern(regexp="user|ai") String role, @NotBlank @Size(max=8000) String text) {}
}
