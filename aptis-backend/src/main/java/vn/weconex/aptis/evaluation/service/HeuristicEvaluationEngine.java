package vn.weconex.aptis.evaluation.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.util.Enums.EvaluationType;

/**
 * Bộ chấm heuristic dùng cho môi trường phát triển và test.
 *
 * <p><b>Đây KHÔNG phải chấm bằng AI.</b> Nó cho điểm dựa trên các dấu hiệu đo
 * được bằng máy: số từ so với yêu cầu, độ đa dạng từ vựng, độ dài câu, có dùng
 * từ nối hay không. Kết quả đủ để chạy và kiểm thử toàn bộ luồng chấm (tạo job →
 * xử lý → lưu điểm → hiển thị), nhưng không phản ánh chất lượng ngôn ngữ thật.
 *
 * <p>Sản phẩm thật phải thay bằng implementation gọi LLM. Xem README để biết
 * cách thêm. Bean này chỉ bật khi {@code aptis.evaluation.heuristic.enabled=true}.
 */
@Slf4j
@Component
@Order(100) // Xếp sau LlmEvaluationEngine: chỉ dùng khi không có engine thật
@ConditionalOnProperty(name = "aptis.evaluation.heuristic.enabled", havingValue = "true")
public class HeuristicEvaluationEngine implements EvaluationEngine {

    /** Từ nối — dấu hiệu của khả năng liên kết ý. */
    private static final Set<String> COHESION_MARKERS = Set.of(
            "however", "therefore", "moreover", "furthermore", "although", "because",
            "besides", "consequently", "meanwhile", "whereas", "in addition",
            "for example", "on the other hand", "as a result", "firstly", "finally");

    /** Dấu hiệu văn phong trang trọng, dùng cho tiêu chí REGISTER. */
    private static final Set<String> FORMAL_MARKERS = Set.of(
            "dear", "sincerely", "regards", "would", "could", "should",
            "i would like", "please", "thank you", "i am writing");

    private static final Set<String> INFORMAL_MARKERS = Set.of(
            "hi", "hey", "gonna", "wanna", "yeah", "stuff", "cool", "awesome");

    public HeuristicEvaluationEngine() {
        log.warn("HeuristicEvaluationEngine đang bật — chấm theo dấu hiệu bề mặt, "
                + "KHÔNG phải AI. Chỉ dùng cho môi trường phát triển.");
    }

    @Override
    public boolean supports(EvaluationType type) {
        return type == EvaluationType.WRITING_AI || type == EvaluationType.SPEAKING_AI;
    }

    @Override
    public String engineName() {
        return "heuristic-v1";
    }

    @Override
    public EvaluationResult evaluate(EvaluationRequest request) {
        String text = request.type() == EvaluationType.SPEAKING_AI
                ? request.transcript()
                : request.textResponse();

        Metrics metrics = analyse(text, request);
        List<CriterionScore> scores = new ArrayList<>();
        double total = 0;
        double max = 0;

        for (CriterionSpec criterion : request.rubric().criteria()) {
            double ratio = ratioFor(criterion.code(), metrics, request);
            // Cùng quy tắc số nguyên như engine AI: học viên không được thấy điểm
            // lẻ chỉ vì hôm đó AI hỏng và hệ thống rơi về engine dự phòng.
            double score = CriterionScoreRounding.toWholeScore(
                    ratio * criterion.maxScore(), criterion.maxScore());

            scores.add(new CriterionScore(
                    criterion.code(),
                    criterion.name(),
                    score,
                    criterion.maxScore(),
                    feedbackFor(criterion.code(), ratio, metrics, request)));

            total += score;
            max += criterion.maxScore();
        }

        double percentage = max > 0 ? total / max * 100 : 0;

        return new EvaluationResult(
                scores, total, max, cefrFor(percentage), buildFeedback(metrics, percentage));
    }

    // -----------------------------------------------------------------

    /**
     * @param wordRatio       tỉ lệ đạt yêu cầu số từ (1.0 = đủ)
     * @param lexicalDiversity số từ khác nhau / tổng số từ
     */
    private record Metrics(
            int wordCount,
            Integer minWords,
            Integer maxWords,
            double wordRatio,
            double lexicalDiversity,
            double avgSentenceLength,
            int cohesionMarkers,
            int formalMarkers,
            int informalMarkers,
            String expectedRegister,
            boolean empty) {
    }

    private Metrics analyse(String text, EvaluationRequest request) {
        String safe = text == null ? "" : text.strip();
        if (safe.isEmpty()) {
            return new Metrics(0, null, null, 0, 0, 0, 0, 0, 0, null, true);
        }

        String lower = safe.toLowerCase(Locale.ROOT);
        String[] words = safe.split("\\s+");
        int wordCount = words.length;

        Set<String> unique = new LinkedHashSet<>();
        Arrays.stream(words)
                .map(w -> w.replaceAll("[^\\p{L}']", "").toLowerCase(Locale.ROOT))
                .filter(w -> !w.isEmpty())
                .forEach(unique::add);

        long sentences = Math.max(1, safe.chars().filter(c -> c == '.' || c == '!' || c == '?').count());

        Integer minWords = intConstraint(request, "minWords");
        Integer maxWords = intConstraint(request, "maxWords");
        // Speaking không đếm từ theo constraint; ước lượng theo thời lượng nói
        if (minWords == null && request.type() == EvaluationType.SPEAKING_AI) {
            Integer responseSeconds = intConstraint(request, "responseSeconds");
            // ~90 từ/phút là mức nói chậm nhưng trôi chảy
            minWords = responseSeconds == null ? null : responseSeconds * 90 / 60;
        }

        double wordRatio = 1.0;
        if (minWords != null && minWords > 0) {
            wordRatio = Math.min(1.0, (double) wordCount / minWords);
        }
        if (maxWords != null && wordCount > maxWords) {
            // Vượt giới hạn bị trừ theo mức vượt
            wordRatio = Math.max(0.4, 1.0 - (double) (wordCount - maxWords) / maxWords);
        }

        Object register = request.constraints() == null
                ? null
                : request.constraints().get("register");

        return new Metrics(
                wordCount,
                minWords,
                maxWords,
                wordRatio,
                (double) unique.size() / wordCount,
                (double) wordCount / sentences,
                (int) COHESION_MARKERS.stream().filter(lower::contains).count(),
                (int) FORMAL_MARKERS.stream().filter(lower::contains).count(),
                (int) INFORMAL_MARKERS.stream().filter(lower::contains).count(),
                register instanceof String s ? s : null,
                false);
    }

    /**
     * Điểm mỗi tiêu chí quy về tỉ lệ 0..1. Mỗi tiêu chí lấy dấu hiệu gần nhất
     * với nó — thô, nhưng minh bạch và lặp lại được.
     */
    private static double ratioFor(
            String criterionCode, Metrics m, EvaluationRequest request) {
        if (m.empty()) {
            return 0;
        }

        return switch (criterionCode) {
            case "TASK_ACHIEVEMENT", "TASK_FULFILMENT" -> m.wordRatio();

            // Từ vựng: đa dạng từ, chuẩn hóa quanh mốc 0.55
            case "VOCABULARY" -> clamp(m.lexicalDiversity() / 0.55);

            // Ngữ pháp: câu quá ngắn hoặc quá dài đều bị trừ
            case "GRAMMAR" -> clamp(1.0 - Math.abs(m.avgSentenceLength() - 14) / 20.0);

            case "COHESION", "COHERENCE" -> clamp(m.cohesionMarkers() / 3.0);

            case "REGISTER" -> registerRatio(m);

            case "PRONUNCIATION" -> acousticRatio(
                    request, "pronunciationClarityEstimate", m.wordRatio() * 0.85);
            case "FLUENCY" -> acousticRatio(
                    request, "fluencyEstimate", m.wordRatio() * 0.85);

            default -> clamp(m.wordRatio() * 0.8);
        };
    }

    private static double registerRatio(Metrics m) {
        boolean wantFormal = m.expectedRegister() == null
                || m.expectedRegister().toUpperCase(Locale.ROOT).contains("FORMAL");

        if (wantFormal) {
            double score = clamp(m.formalMarkers() / 2.0);
            // Dùng từ thân mật trong bài trang trọng bị trừ
            return Math.max(0, score - m.informalMarkers() * 0.2);
        }
        return clamp((m.informalMarkers() + 1) / 2.0);
    }

    private static String feedbackFor(
            String code, double ratio, Metrics m, EvaluationRequest request) {
        if (m.empty()) {
            return "Không có nội dung để đánh giá.";
        }

        return switch (code) {
            case "TASK_ACHIEVEMENT", "TASK_FULFILMENT" -> m.minWords() != null && m.wordCount() < m.minWords()
                    ? "Bài viết %d từ, chưa đạt yêu cầu %d từ.".formatted(m.wordCount(), m.minWords())
                    : m.maxWords() != null && m.wordCount() > m.maxWords()
                            ? "Bài vượt %d từ so với giới hạn %d.".formatted(
                                    m.wordCount() - m.maxWords(), m.maxWords())
                            : "Độ dài đạt yêu cầu (%d từ).".formatted(m.wordCount());

            case "VOCABULARY" -> ratio >= 0.7
                    ? "Từ vựng đa dạng (%.0f%% từ không lặp lại).".formatted(m.lexicalDiversity() * 100)
                    : "Từ vựng còn lặp; thử dùng từ đồng nghĩa để tránh nhắc lại.";

            case "GRAMMAR" -> "Độ dài câu trung bình %.0f từ.".formatted(m.avgSentenceLength())
                    + (ratio >= 0.7 ? " Cấu trúc câu cân đối." : " Nên đa dạng độ dài câu hơn.");

            case "COHESION", "COHERENCE" -> m.cohesionMarkers() == 0
                    ? "Chưa dùng từ nối. Thêm however, therefore, for example… để ý liên kết hơn."
                    : "Có dùng %d từ nối.".formatted(m.cohesionMarkers());

            case "REGISTER" -> m.informalMarkers() > 0 && ratio < 0.7
                    ? "Có từ ngữ thân mật chưa phù hợp với văn phong yêu cầu."
                    : "Văn phong phù hợp yêu cầu.";

            case "PRONUNCIATION" -> request.acousticMetrics().containsKey("pronunciationClarityEstimate")
                    ? "Độ rõ phát âm được ước lượng %.0f%% từ bộ phân tích audio local; chưa phải chấm phoneme."
                            .formatted(ratio * 100)
                    : "Chưa có chỉ số audio; điểm tạm chỉ dựa trên độ dài nội dung nói.";

            case "FLUENCY" -> request.acousticMetrics().containsKey("fluencyEstimate")
                    ? "Độ trôi chảy local %.0f%%, tốc độ %.0f từ/phút và %d khoảng dừng dài."
                            .formatted(
                                    ratio * 100,
                                    acousticValue(request, "wordsPerMinute", 0),
                                    Math.round(acousticValue(request, "longPauseCount", 0)))
                    : "Chưa có chỉ số audio; điểm tạm chỉ dựa trên độ dài nội dung nói.";

            default -> "Đã đánh giá theo độ dài và cấu trúc nội dung.";
        };
    }

    private static double acousticRatio(
            EvaluationRequest request, String key, double fallback) {
        return clamp(acousticValue(request, key, fallback));
    }

    private static double acousticValue(
            EvaluationRequest request, String key, double fallback) {
        if (request.acousticMetrics() == null) return fallback;
        Object value = request.acousticMetrics().get(key);
        if (!(value instanceof Number number) || !Double.isFinite(number.doubleValue())) {
            return fallback;
        }
        return number.doubleValue();
    }

    private Feedback buildFeedback(Metrics m, double percentage) {
        if (m.empty()) {
            return new Feedback(
                    "Không có nội dung để chấm.",
                    List.of(),
                    List.of("Học viên không nộp nội dung."),
                    List.of("Làm lại bài và nộp nội dung."),
                    null);
        }

        List<String> strengths = new ArrayList<>();
        List<String> weaknesses = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();

        if (m.wordRatio() >= 1.0) {
            strengths.add("Đáp ứng yêu cầu độ dài");
        } else {
            weaknesses.add("Nội dung ngắn hơn yêu cầu");
            suggestions.add("Bổ sung ví dụ hoặc lý do để triển khai ý đầy đủ hơn");
        }

        if (m.lexicalDiversity() >= 0.55) {
            strengths.add("Từ vựng đa dạng");
        } else {
            weaknesses.add("Từ vựng còn lặp lại");
            suggestions.add("Dùng từ đồng nghĩa thay cho từ bị nhắc nhiều lần");
        }

        if (m.cohesionMarkers() >= 2) {
            strengths.add("Có liên kết ý bằng từ nối");
        } else {
            weaknesses.add("Ít từ nối");
            suggestions.add("Thêm từ nối để mạch ý rõ hơn");
        }

        if (m.informalMarkers() > 0 && registerRatio(m) < 0.7) {
            weaknesses.add("Văn phong chưa nhất quán");
            suggestions.add("Tránh từ ngữ thân mật trong bài trang trọng");
        }

        return new Feedback(
                "Đạt %.0f%% điểm tối đa. Đây là đánh giá tự động theo dấu hiệu bề mặt, "
                        .formatted(percentage)
                        + "không thay thế được nhận xét của giáo viên.",
                strengths,
                weaknesses,
                suggestions,
                null);
    }

    private static String cefrFor(double percentage) {
        if (percentage >= 90) {
            return "C2";
        }
        if (percentage >= 78) {
            return "C1";
        }
        if (percentage >= 62) {
            return "B2";
        }
        if (percentage >= 45) {
            return "B1";
        }
        if (percentage >= 28) {
            return "A2";
        }
        return "A1";
    }

    private static Integer intConstraint(EvaluationRequest request, String key) {
        if (request.constraints() == null) {
            return null;
        }
        Object value = request.constraints().get(key);
        return value instanceof Number number ? number.intValue() : null;
    }

    private static double clamp(double value) {
        return Math.max(0, Math.min(1, value));
    }
}
