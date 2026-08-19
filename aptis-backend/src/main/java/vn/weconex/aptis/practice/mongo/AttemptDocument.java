package vn.weconex.aptis.practice.mongo;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;

/**
 * Snapshot đề + câu trả lời của một lượt làm bài.
 *
 * <p>Snapshot là bất biến sau khi tạo: admin sửa câu hỏi không làm thay đổi bài
 * đã làm, và kết quả cũ vẫn kiểm tra lại được (PHẦN II §22).
 */
@Document(collection = "attempt_documents")
@Getter
@Setter
@NoArgsConstructor
public class AttemptDocument {

    @Id
    private String id;

    private String attemptId;
    private String userId;
    private String mode;
    private String status;

    private ConfigSnapshot configSnapshot = new ConfigSnapshot();
    private List<QuestionSetEntry> questionSets = new ArrayList<>();

    private Instant createdAt;
    private Instant updatedAt;

    public QuestionSetEntry findEntry(String attemptQuestionSetId) {
        return questionSets.stream()
                .filter(e -> attemptQuestionSetId.equals(e.getAttemptQuestionSetId()))
                .findFirst()
                .orElse(null);
    }

    public QuestionSetEntry findEntryByQuestionSetId(String questionSetId) {
        return questionSets.stream()
                .filter(e -> questionSetId.equals(e.getQuestionSetId()))
                .findFirst()
                .orElse(null);
    }

    // -----------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    public static class ConfigSnapshot {
        private Integer durationSeconds;
        private boolean showAnswerDuringTest;
        private boolean allowReview = true;
        private String accessLevel;
        /** Seed trộn đáp án, giữ cố định để client tải lại vẫn thấy thứ tự cũ. */
        private Long shuffleSeed;
        /** partId -> quy tắc chấm tại thời điểm tạo attempt. */
        private Map<String, PartScoringRuleSnapshot> partScoringRules = new LinkedHashMap<>();
        /** null = attempt cũ chưa có snapshot; 1 = kể cả map rỗng cũng đã được đóng băng. */
        private Integer scoringRuleSnapshotVersion;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class PartScoringRuleSnapshot {
        private String ruleId;
        private String partId;
        private String maxScore;
        private String pointsPerCorrect;
        private String perfectBonus;
        private boolean includedInOverall;
        /** Phiên bản audit của rule trong MySQL. */
        private Instant updatedAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class QuestionSetEntry {
        private String attemptQuestionSetId;
        private String questionSetId;
        private int revision;
        private int displayOrder;

        /** Bản copy đầy đủ, CÒN answer key — dùng để chấm. */
        private QuestionSetDocument snapshot;

        private Response response = new Response();
        private Score score;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Response {
        private String status = "NOT_STARTED";
        private Instant startedAt;
        private Instant answeredAt;
        private int timeSpentSeconds;
        private List<ItemResponse> itemResponses = new ArrayList<>();

        public ItemResponse findItemResponse(String itemId) {
            return itemResponses.stream()
                    .filter(r -> itemId.equals(r.getItemId()))
                    .findFirst()
                    .orElse(null);
        }

        /** Ghi đè câu trả lời cũ của cùng item (autosave gọi nhiều lần). */
        public void upsert(ItemResponse response) {
            itemResponses.removeIf(r -> response.getItemId().equals(r.getItemId()));
            itemResponses.add(response);
        }
    }

    /**
     * Chỉ một trong các trường trả lời được dùng, tùy responseType.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ItemResponse {
        private String itemId;
        private String responseType;

        private String selectedOptionId;
        private List<String> selectedOptionIds = new ArrayList<>();
        private Map<String, String> matches = new LinkedHashMap<>();
        private List<String> orderedOptionIds = new ArrayList<>();
        private String textValue;
        /** asset_id của file ghi âm trên MinIO. */
        private String recordingAssetId;
        private String transcript;
        private Map<String, Object> acousticMetrics = new LinkedHashMap<>();
        private String audioAnalysisSource;

        private Instant answeredAt;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Score {
        private double rawScore;
        private double maxScore;
        private Boolean isCorrect;
        private List<ItemScore> itemScores = new ArrayList<>();
        private Instant scoredAt;
        /** AUTO | AI | TEACHER */
        private String scoredBy = "AUTO";
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class ItemScore {
        private String itemId;
        private double rawScore;
        private double maxScore;
        private boolean correct;
        /**
         * Số đơn vị đúng bên trong item và tổng số đơn vị.
         *
         * <p>Item MATCHING của Reading Part 3 là 14 cặp ghép trong một item, nên
         * cờ {@code correct} một mình không đủ: ghép đúng 2/14 vẫn là
         * {@code correct=false} và bảng điểm hiện "0 câu đúng" dù có 4 điểm.
         *
         * <p>Bản ghi cũ không có hai field này (mặc định 0); {@link #unitsTotal()}
         * và {@link #unitsCorrect()} suy ra từ {@code correct} khi đó.
         */
        private int correctUnits;
        private int totalUnits;

        /** Tổng số đơn vị, suy ra cho bản ghi cũ chưa có field. */
        public int unitsTotal() {
            return totalUnits > 0 ? totalUnits : 1;
        }

        /** Số đơn vị đúng, suy ra cho bản ghi cũ chưa có field. */
        public int unitsCorrect() {
            if (totalUnits > 0) {
                return correctUnits;
            }
            return correct ? 1 : 0;
        }
    }
}
