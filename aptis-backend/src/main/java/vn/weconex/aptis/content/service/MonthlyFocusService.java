package vn.weconex.aptis.content.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.asset.service.MinioStorageClient;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocumentRepository;
import vn.weconex.aptis.content.web.MonthlyFocusDtos;
import vn.weconex.aptis.entitlement.service.EntitlementService;

/**
 * Đề trọng điểm tháng: danh sách đề chọn lọc theo trang luyện, đồng bộ hằng tuần
 * từ aptisprep.com (scripts/aptisprep-monthly-focus.mjs).
 *
 * <p>Khác luồng làm bài thường: trình luyện chấm ngay trên trình duyệt từng câu
 * (Kiểm tra, Xem đáp án, Rush Mode), không tạo attempt — nên nội dung trả ra đã lộ
 * đáp án. Vì thế quyền xem nằm ở đây: Premium xem hết, tài khoản miễn phí chỉ
 * {@link #FREE_LIMIT} câu đầu mỗi trang (như giới hạn làm thử của website).
 */
@Service
@RequiredArgsConstructor
public class MonthlyFocusService {

    public static final int FREE_LIMIT = 10;
    public static final Set<String> PAGES = Set.of(
            "listening-1", "listening-2", "listening-3", "listening-4",
            "reading-1", "reading-2-3", "reading-4", "reading-5",
            "speaking-1", "speaking-2", "speaking-3", "speaking-4",
            "writing");
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate jdbc;
    private final QuestionSetDocumentRepository documents;
    private final QuestionSetSanitizer sanitizer;
    private final EntitlementService entitlements;
    private final AssetRepository assets;
    private final MinioStorageClient storage;
    private final ObjectMapper objectMapper;

    private record Row(String questionSetId, String topicKey, Integer clubPart, Integer version, String title, int revision) {
    }

    @Transactional(readOnly = true)
    public MonthlyFocusDtos.SummaryResponse summary() {
        Map<String, Integer> counts = new LinkedHashMap<>();
        jdbc.query("""
                SELECT i.page_key, COUNT(DISTINCT i.question_set_id) AS n
                FROM monthly_focus_items i JOIN question_sets qs ON qs.id = i.question_set_id AND qs.status = 'PUBLISHED'
                GROUP BY i.page_key
                """, rs -> {
            counts.put(rs.getString("page_key"), rs.getInt("n"));
        });
        return new MonthlyFocusDtos.SummaryResponse(counts);
    }

    /**
     * Một trang luyện. {@code topicKey} lọc theo câu lạc bộ (trang Writing); trang
     * khác để null.
     */
    @Transactional(readOnly = true)
    public MonthlyFocusDtos.PageResponse page(String userId, String pageKey, String topicKey) {
        requirePage(pageKey);
        boolean premium = entitlements.hasPremiumAccess(userId);
        List<Row> rows = rows(pageKey);
        // Câu làm thử tính theo thứ tự cả trang (cả mọi câu lạc bộ), để đổi câu lạc bộ
        // không mở thêm được câu miễn phí.
        Set<String> free = rows.stream().map(Row::questionSetId).distinct().limit(FREE_LIMIT).collect(Collectors.toSet());
        List<Row> shown = topicKey == null ? rows : rows.stream().filter(r -> topicKey.equals(r.topicKey())).toList();

        Map<String, QuestionSetDocument> docs = currentDocuments(shown);
        List<MonthlyFocusDtos.ItemResponse> items = new ArrayList<>();
        for (Row row : shown) {
            boolean locked = !premium && !free.contains(row.questionSetId());
            QuestionSetDocument doc = docs.get(row.questionSetId());
            if (doc == null) {
                continue;
            }
            items.add(new MonthlyFocusDtos.ItemResponse(
                    row.questionSetId(), row.topicKey(), row.clubPart(), row.version(), row.title(), locked,
                    locked ? null : sanitizer.sanitize(doc, true, true, null)));
        }

        List<MonthlyFocusDtos.TopicResponse> topics = topics(pageKey).stream()
                .filter(t -> topicKey == null || topicKey.equals(t.topicKey()))
                .toList();
        return new MonthlyFocusDtos.PageResponse(pageKey, premium, FREE_LIMIT, topics, items, tips(pageKey));
    }

    @Transactional(readOnly = true)
    public MonthlyFocusDtos.WritingOverviewResponse writingOverview() {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate date = jdbc.query("""
                SELECT MAX(predict_date) FROM exam_predictions WHERE status = 'PUBLISHED' AND predict_date <= ?
                """, rs -> rs.next() && rs.getDate(1) != null ? rs.getDate(1).toLocalDate() : null, today);
        List<String> hot = date == null ? List.of() : jdbc.queryForList("""
                SELECT ep.label FROM exam_predictions ep
                JOIN components c ON c.id = ep.component_id AND c.code = 'WRITING'
                WHERE ep.status = 'PUBLISHED' AND ep.priority = 'HOT' AND ep.predict_date = ?
                ORDER BY ep.display_order, ep.label
                """, String.class, date);
        return new MonthlyFocusDtos.WritingOverviewResponse(date, hot.stream().distinct().toList(), topics("writing"));
    }

    /** URL ký cho audio/ảnh của một đề — chỉ khi đề thuộc trang và học viên được xem. */
    @Transactional(readOnly = true)
    public MonthlyFocusDtos.AssetUrlsResponse assetUrls(String userId, String pageKey, String questionSetId) {
        requirePage(pageKey);
        List<Row> rows = rows(pageKey);
        int index = rows.stream().map(Row::questionSetId).distinct().toList().indexOf(questionSetId);
        if (index < 0) {
            throw ApiException.notFound("MonthlyFocusItem", questionSetId);
        }
        if (index >= FREE_LIMIT && !entitlements.hasPremiumAccess(userId)) {
            throw ApiException.premiumRequired();
        }
        Row row = rows.stream().filter(r -> r.questionSetId().equals(questionSetId)).findFirst().orElseThrow();
        QuestionSetDocument doc = currentDocuments(List.of(row)).get(questionSetId);
        Map<String, String> urls = new LinkedHashMap<>();
        if (doc != null && doc.getAssets() != null) {
            List<String> ids = doc.getAssets().stream().map(QuestionSetDocument.AssetRef::getAssetId).distinct().toList();
            for (Asset asset : assets.findAllById(ids)) {
                if (asset.isReady()) {
                    urls.put(asset.getId(), storage.presignedDownloadUrl(asset.getBucketName(), asset.getObjectKey()));
                }
            }
        }
        return new MonthlyFocusDtos.AssetUrlsResponse(urls);
    }

    @Transactional(readOnly = true)
    public List<MonthlyFocusDtos.ProgressEntry> progress(String userId, String pageKey) {
        requirePage(pageKey);
        return jdbc.query("""
                SELECT question_set_id, attempts, correct_attempts, last_result
                FROM monthly_focus_progress WHERE user_id = ? AND page_key = ?
                """, (rs, i) -> new MonthlyFocusDtos.ProgressEntry(
                rs.getString("question_set_id"), rs.getInt("attempts"), rs.getInt("correct_attempts"),
                rs.getString("last_result") == null ? null : MonthlyFocusDtos.Result.valueOf(rs.getString("last_result"))),
                userId, pageKey);
    }

    /** Ghi một lần làm câu: tăng số lần làm, số lần đúng, nhớ kết quả gần nhất. */
    @Transactional
    public MonthlyFocusDtos.ProgressEntry record(String userId, String pageKey, MonthlyFocusDtos.RecordProgressRequest request) {
        requirePage(pageKey);
        Integer belongs = jdbc.queryForObject(
                "SELECT COUNT(*) FROM monthly_focus_items WHERE page_key = ? AND question_set_id = ?",
                Integer.class, pageKey, request.questionSetId());
        if (belongs == null || belongs == 0) {
            throw ApiException.notFound("MonthlyFocusItem", request.questionSetId());
        }
        int correct = request.result() == MonthlyFocusDtos.Result.CORRECT ? 1 : 0;
        jdbc.update("""
                INSERT INTO monthly_focus_progress
                    (user_id, page_key, question_set_id, attempts, correct_attempts, last_result, updated_at)
                VALUES (?, ?, ?, 1, ?, ?, UTC_TIMESTAMP())
                ON DUPLICATE KEY UPDATE
                    attempts = attempts + 1,
                    correct_attempts = correct_attempts + VALUES(correct_attempts),
                    last_result = VALUES(last_result),
                    updated_at = UTC_TIMESTAMP()
                """, userId, pageKey, request.questionSetId(), correct, request.result().name());
        return progress(userId, pageKey).stream()
                .filter(p -> p.questionSetId().equals(request.questionSetId()))
                .findFirst().orElseThrow();
    }

    /** "Xóa kết quả các câu đã làm". */
    @Transactional
    public void clear(String userId, String pageKey) {
        requirePage(pageKey);
        jdbc.update("DELETE FROM monthly_focus_progress WHERE user_id = ? AND page_key = ?", userId, pageKey);
    }

    // -------------------------------------------------------------------------

    private static void requirePage(String pageKey) {
        if (!PAGES.contains(pageKey)) {
            throw ApiException.notFound("MonthlyFocusPage", pageKey);
        }
    }

    /** Đề của trang theo đúng thứ tự hiển thị: chủ đề/câu lạc bộ, Part câu lạc bộ, thứ tự đồng bộ. */
    private List<Row> rows(String pageKey) {
        return jdbc.query("""
                SELECT i.question_set_id, i.topic_key, i.club_part, i.version_no, qs.title, qs.current_revision
                FROM monthly_focus_items i
                JOIN question_sets qs ON qs.id = i.question_set_id AND qs.status = 'PUBLISHED'
                LEFT JOIN monthly_focus_topics t ON t.page_key = i.page_key AND t.topic_key = i.topic_key
                WHERE i.page_key = ?
                ORDER BY COALESCE(t.display_order, 0), i.club_part, i.display_order, i.id
                """, (rs, i) -> new Row(
                rs.getString("question_set_id"), rs.getString("topic_key"),
                (Integer) rs.getObject("club_part"), (Integer) rs.getObject("version_no"),
                rs.getString("title"), rs.getInt("current_revision")), pageKey);
    }

    /** Document đang hiệu lực (đúng current_revision) của các đề, theo questionSetId. */
    private Map<String, QuestionSetDocument> currentDocuments(List<Row> rows) {
        Map<String, Integer> revision = rows.stream()
                .collect(Collectors.toMap(Row::questionSetId, Row::revision, (a, b) -> a));
        return documents.findByQuestionSetIdIn(new ArrayList<>(revision.keySet())).stream()
                .filter(d -> d.getRevision() == revision.get(d.getQuestionSetId()))
                .collect(Collectors.toMap(QuestionSetDocument::getQuestionSetId, Function.identity(), (a, b) -> a));
    }

    private List<MonthlyFocusDtos.TopicResponse> topics(String pageKey) {
        return jdbc.query("""
                SELECT topic_key, title, stars, topic_rank, icon_name, color, description
                FROM monthly_focus_topics WHERE page_key = ? ORDER BY display_order, title
                """, (rs, i) -> new MonthlyFocusDtos.TopicResponse(
                rs.getString("topic_key"), rs.getString("title"),
                (Integer) rs.getObject("stars"), (Integer) rs.getObject("topic_rank"),
                rs.getString("icon_name"), rs.getString("color"), rs.getString("description")), pageKey);
    }

    /** Mẹo theo trang; trang câu lạc bộ Writing lấy mẹo của cả 4 Part (writing-1..4). */
    private List<MonthlyFocusDtos.TipResponse> tips(String pageKey) {
        List<String> keys = "writing".equals(pageKey)
                ? List.of("writing-1", "writing-2", "writing-3", "writing-4")
                : List.of(pageKey);
        String placeholders = String.join(",", keys.stream().map(k -> "?").toList());
        return jdbc.query(
                "SELECT title, description, content FROM study_part_tips WHERE page_key IN (" + placeholders + ")"
                        + " ORDER BY FIELD(page_key, " + placeholders + "), display_order",
                (rs, i) -> new MonthlyFocusDtos.TipResponse(
                        rs.getString("title"), rs.getString("description"), parseLines(rs.getString("content"))),
                concat(keys, keys));
    }

    private static Object[] concat(List<String> a, List<String> b) {
        List<String> all = new ArrayList<>(a);
        all.addAll(b);
        return all.toArray();
    }

    private List<String> parseLines(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() { });
        } catch (Exception e) {
            return List.of();
        }
    }
}
