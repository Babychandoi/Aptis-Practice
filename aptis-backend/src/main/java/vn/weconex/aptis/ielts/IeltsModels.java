package vn.weconex.aptis.ielts;

import java.time.Instant;
import java.util.*;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

/** IELTS owns its content and attempts; the Aptis scales are never reused. */
public final class IeltsModels {
    private IeltsModels() {}
    public enum Track { ACADEMIC, GENERAL_TRAINING }
    public enum Skill { LISTENING, READING, WRITING, SPEAKING }
    public enum Type { SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE_NOT_GIVEN,
        YES_NO_NOT_GIVEN, MATCHING, SHORT_TEXT, LONG_TEXT, AUDIO_RECORDING }
    public enum Status { IN_PROGRESS, PENDING_REVIEW, COMPLETED }
    public record Option(String id, String text) {}
    public record Question(String id, Type type, String prompt, List<Option> options,
        List<String> answers, String explanation, Integer maxWords, Integer minWords,
        Integer responseSeconds) {}
    public record Group(String id, Skill skill, int part, String title, String instructions,
        String passage, String assetId, List<Question> questions) {}
    public record Response(String text, List<String> selected, String recordingAssetId) {}
    public record Review(Map<String, Double> criteria, String feedback, String reviewerId,
        Instant reviewedAt) {}
    public record SkillResult(Integer correct, Integer total, Double band, String state) {}
    public record QuestionResult(List<String> acceptedAnswers, String explanation, Boolean correct) {}
    public record ExamSummary(String id, String title, Track track, boolean fullLength,
        boolean premium, List<Skill> skills, int questionCount) {}
    public record AttemptSummary(String id, String title, Track track, Status status,
        Instant createdAt, Map<Skill, SkillResult> scores, Double overallBand) {}
    public record PublicQuestion(String id, Type type, String prompt, List<Option> options,
        Integer maxWords, Integer minWords, Integer responseSeconds) {}
    public record PublicGroup(String id, Skill skill, int part, String title,
        String instructions, String passage, String assetId, List<PublicQuestion> questions) {}
    public record AttemptView(String id, String title, Track track, Status status,
        boolean fullLength, List<PublicGroup> groups, Map<String, Response> responses,
        Skill activeSkill, Instant deadline, Long version, Map<Skill, SkillResult> scores,
        Double overallBand, Map<String, QuestionResult> answers, Map<String, Review> reviews) {}

    @Data @Document("ielts_exams")
    public static class Exam {
        @Id private String id;
        @Version private Long version;
        private String title;
        private Track track;
        private boolean fullLength;
        private boolean premium;
        private boolean published;
        private String authorId;
        private List<Group> groups = new ArrayList<>();
        private Instant updatedAt;
    }
    @Data @Document("ielts_attempts")
    public static class Attempt {
        @Id private String id;
        @Version private Long version;
        private String userId;
        private String examId;
        private String examAuthorId;
        private String title;
        private Track track;
        private boolean fullLength;
        private List<Group> snapshot;
        private Status status = Status.IN_PROGRESS;
        private Map<String, Response> responses = new LinkedHashMap<>();
        private Map<String, Review> reviews = new LinkedHashMap<>();
        private Set<Skill> submittedSkills = new LinkedHashSet<>();
        private Skill activeSkill;
        private Instant deadline;
        private Instant createdAt;
    }
}
