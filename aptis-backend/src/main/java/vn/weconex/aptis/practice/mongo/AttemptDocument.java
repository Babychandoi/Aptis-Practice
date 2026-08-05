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
    }
}
