package vn.weconex.aptis.content.service;

import java.sql.Date;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.content.web.DailyWarmUpDtos;

/**
 * Khởi động hằng ngày ở trang chủ, cùng lịch với aptisprep.com: tính từ 11/11/2026,
 * ngày lẻ gõ lại câu Writing, ngày chẵn luyện Speaking Marathon một Part (1→4 xoay
 * vòng). Dữ liệu do scripts/aptisprep-warmup.mjs ghi vào.
 */
@Service
@RequiredArgsConstructor
public class DailyWarmUpService {

    static final LocalDate EPOCH = LocalDate.of(2026, 11, 11);
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final TypeReference<List<DailyWarmUpDtos.TypingItem>> ITEMS = new TypeReference<>() { };
    private static final TypeReference<List<String>> STRINGS = new TypeReference<>() { };

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    @Autowired(required = false)
    private Clock clock;

    @Transactional(readOnly = true)
    public DailyWarmUpDtos.WarmUpResponse today() {
        LocalDate day = LocalDate.now(clock == null ? Clock.system(BUSINESS_ZONE) : clock.withZone(BUSINESS_ZONE));
        Integer part = speakingPartOf(day);
        if (part != null) {
            List<DailyWarmUpDtos.MarathonQuestion> picked = pickMarathon(marathonQuestions(part), part, day);
            if (!picked.isEmpty()) {
                return new DailyWarmUpDtos.WarmUpResponse(day.toString(), "SPEAKING", part, List.of(), picked);
            }
        }
        // Ngày Speaking mà chưa có câu thì vẫn cho gõ, để ngày nào cũng có bài.
        List<DailyWarmUpDtos.TypingItem> items = typingItems(day);
        return new DailyWarmUpDtos.WarmUpResponse(
                day.toString(), items.isEmpty() ? "NONE" : "TYPING", null, items, List.of());
    }

    /** Part Speaking của ngày, hoặc null nếu là ngày gõ. */
    static Integer speakingPartOf(LocalDate day) {
        long offset = ChronoUnit.DAYS.between(EPOCH, day);
        if (Math.floorMod(offset, 2) == 1) {
            return null;
        }
        return (int) Math.floorMod(Math.floorDiv(offset, 2), 4) + 1;
    }

    /**
     * Chọn câu của ngày: Part 1 lấy 3 câu liền nhau, Part khác lấy một nhóm (một
     * bức tranh và các câu đi kèm). Cùng cách chọn với website để hai bên ra cùng đề.
     */
    static List<DailyWarmUpDtos.MarathonQuestion> pickMarathon(
            List<DailyWarmUpDtos.MarathonQuestion> all, int part, LocalDate day) {
        if (all.isEmpty()) {
            return List.of();
        }
        long n = day.toEpochDay();
        if (part == 1) {
            int start = (int) Math.floorMod(n, Math.max(1, all.size() - 2));
            return all.subList(start, Math.min(all.size(), start + 3));
        }
        List<String> groups = new ArrayList<>(new LinkedHashSet<>(all.stream().map(DailyWarmUpService::groupOf).toList()));
        String group = groups.get((int) Math.floorMod(n, groups.size()));
        return all.stream().filter(q -> group.equals(groupOf(q))).toList();
    }

    private static String groupOf(DailyWarmUpDtos.MarathonQuestion q) {
        return Objects.requireNonNullElse(q.groupId(), q.id());
    }

    private List<DailyWarmUpDtos.TypingItem> typingItems(LocalDate day) {
        List<String> rows = jdbc.queryForList(
                "SELECT items FROM daily_warm_ups WHERE day_key <= ? ORDER BY day_key DESC LIMIT 1",
                String.class, Date.valueOf(day));
        return rows.isEmpty() ? List.of() : read(rows.get(0), ITEMS);
    }

    private List<DailyWarmUpDtos.MarathonQuestion> marathonQuestions(int part) {
        return jdbc.query("""
                SELECT id, group_id, question, question_vi, ideas, ideas_vi, sentences, sentences_vi, images
                FROM speaking_marathon_questions WHERE part = ? ORDER BY display_order, id
                """, (rs, i) -> new DailyWarmUpDtos.MarathonQuestion(
                rs.getString("id"),
                rs.getString("group_id"),
                rs.getString("question"),
                rs.getString("question_vi"),
                read(rs.getString("ideas"), STRINGS),
                read(rs.getString("ideas_vi"), STRINGS),
                read(rs.getString("sentences"), STRINGS),
                read(rs.getString("sentences_vi"), STRINGS),
                read(rs.getString("images"), STRINGS)), part);
    }

    private <T> List<T> read(String json, TypeReference<List<T>> type) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<T> list = objectMapper.readValue(json, type);
            return list == null ? List.of() : list;
        } catch (Exception ex) {
            return List.of();
        }
    }
}
