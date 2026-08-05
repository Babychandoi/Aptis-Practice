package vn.weconex.aptis.content.mongo;

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
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Nội dung chi tiết của một bộ câu hỏi.
 *
 * <p>{@code _id} = questionSetId (cùng UUID với MySQL). Cấu trúc linh hoạt
 * theo từng dạng bài — xem PHẦN II §21 cho ví dụ mỗi responseType.
 */
@Document(collection = "question_set_documents")
@Getter
@Setter
@NoArgsConstructor
public class QuestionSetDocument {

    @Id
    private String id;

    private String questionSetId;
    private int revision;
    private int schemaVersion = 1;

    private String partId;
    private String taskTypeCode;

    private String title;
    private String instructions;
    private String accessLevel;

    /** Đoạn văn / audio / tranh dùng chung cho cả bộ. */
    private RichContent stimulus;

    /** Các đoạn được đánh nhãn, dùng cho heading matching. */
    private List<Section> sections = new ArrayList<>();

    private List<Item> items = new ArrayList<>();
    private List<AssetRef> assets = new ArrayList<>();

    private Settings settings = new Settings();
    private Scoring scoring = new Scoring();

    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;

    // -----------------------------------------------------------------

    @Getter
    @Setter
    @NoArgsConstructor
    public static class RichContent {
        /** RICH_TEXT | AUDIO | IMAGE */
        private String type;
        /** HTML | PLAIN_TEXT | MARKDOWN */
        private String format;
        private String value;
    }

    /*
     * Các lớp lồng dùng @Field("id"): Spring Data MongoDB mặc định coi field tên
     * "id" là identifier và đọc từ khóa "_id". Subdocument không có "_id" nên
     * giá trị sẽ về null. Phải chỉ định tên khóa tường minh.
     */

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Section {
        @Field("id")
        private String id;

        private String label;
        private RichContent content;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Option {
        @Field("id")
        private String id;

        private String code;
        private String content;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Item {
        @Field("id")
        private String id;

        private int sequenceNo;
        private RichContent prompt;
        private String responseType;
        private boolean required = true;
        private double maxScore = 1;

        /** Dùng cho SINGLE_CHOICE / MULTIPLE_CHOICE / ORDERING. */
        private List<Option> options = new ArrayList<>();

        /** Dùng cho MATCHING. */
        private List<Option> leftItems = new ArrayList<>();
        private List<Option> rightItems = new ArrayList<>();

        /** Ràng buộc cho LONG_TEXT / AUDIO_RECORDING (minWords, responseSeconds...). */
        private Map<String, Object> constraints = new LinkedHashMap<>();

        private String rubricCode;

        /**
         * Đáp án. PHẢI được loại bỏ trước khi trả về cho học viên trong lúc làm bài
         * (PHẦN VII §51).
         */
        private AnswerKey answerKey;

        private RichContent explanation;
    }

    /**
     * Hình dạng thay đổi theo type:
     * <ul>
     *   <li>SINGLE_CHOICE — selectedOptionId</li>
     *   <li>MULTIPLE_CHOICE — selectedOptionIds</li>
     *   <li>MATCHING — matches (leftId -> rightId)</li>
     *   <li>ORDERING — orderedOptionIds</li>
     *   <li>TEXT_EXACT — acceptedValues</li>
     * </ul>
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class AnswerKey {
        private String type;
        private String selectedOptionId;
        private List<String> selectedOptionIds = new ArrayList<>();
        private Map<String, String> matches = new LinkedHashMap<>();
        private List<String> orderedOptionIds = new ArrayList<>();
        private List<String> acceptedValues = new ArrayList<>();
        private boolean caseSensitive;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class AssetRef {
        private String assetId;
        /** MAIN_AUDIO | STIMULUS_IMAGE | COMPARISON_IMAGE_A ... */
        private String role;
        private int displayOrder = 1;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Settings {
        private boolean shuffleOptions;
        private boolean shuffleItems;
        /** null = không giới hạn số lần phát audio. */
        private Integer maxAudioPlays;
        private boolean showAnswerAfterEachItem;
        private boolean allowReview = true;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Scoring {
        /** EXACT_MATCH | PARTIAL_CREDIT | RUBRIC */
        private String strategy = "EXACT_MATCH";
        private boolean partialCredit;
        private double maxScore = 1;
    }
}
