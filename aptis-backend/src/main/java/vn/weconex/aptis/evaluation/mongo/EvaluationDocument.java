package vn.weconex.aptis.evaluation.mongo;

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

/**
 * Kết quả chấm chi tiết theo rubric (PHẦN II §23).
 */
@Document(collection = "evaluation_documents")
@Getter
@Setter
@NoArgsConstructor
public class EvaluationDocument {

    @Id
    private String id;

    private String evaluationJobId;
    private String attemptId;
    private String questionSetId;
    private String userId;

    private Evaluator evaluator = new Evaluator();
    private Input input = new Input();
    private List<Criterion> criteria = new ArrayList<>();

    private double totalScore;
    private double maxScore;
    private String cefrLevel;

    private Feedback feedback = new Feedback();
    private String status;
    private Instant createdAt;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Evaluator {
        /** AI | TEACHER | MODERATOR */
        private String type;
        private String provider;
        private String model;
        private String promptVersion;
        private String rubricVersion;
        /** Có giá trị khi giáo viên chấm. */
        private String userId;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Input {
        private String textResponse;
        private String recordingAssetId;
        private String transcript;
        private Integer wordCount;
        private Long durationMs;
        private Map<String, Object> acousticMetrics = new LinkedHashMap<>();
        private String audioAnalysisSource;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Criterion {
        private String code;
        private String name;
        private double score;
        private double maxScore;
        private String feedback;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Feedback {
        private String summary;
        private List<String> strengths = new ArrayList<>();
        private List<String> weaknesses = new ArrayList<>();
        private List<String> suggestions = new ArrayList<>();
        /** Bản sửa tham khảo cho Writing. */
        private String correctedVersion;
    }
}
