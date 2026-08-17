package vn.weconex.aptis.content.web;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocumentRepository;
import vn.weconex.aptis.content.repository.QuestionSetRepository;

/**
 * Mẹo học: bảng mã đáp án Listening Part 3.
 *
 * <p>Part 3 hỏi mỗi nhận định là của Nam, Nữ hay Cả hai. Bốn câu của một chủ đề
 * rút gọn thành một mã bốn số (Man=1, Woman=2, Both=0) để học viên nhớ trước khi
 * thi — đây là cách ôn phổ biến của học viên Aptis.
 *
 * <p>Mã sinh từ chính đáp án trong ngân hàng, không nhập tay: sửa đề là mã tự
 * đúng theo.
 */
@RestController
@RequestMapping("/api/v1/study-tips")
@RequiredArgsConstructor
public class StudyTipsController {

    /** Listening Part 3. */
    private static final String LISTENING_PART_3 = "16000000-0000-4000-8000-000000000023";
    /** Reading Part 3 — ghép nhận định với người nói. */
    private static final String READING_PART_3 = "16000000-0000-4000-8000-000000000013";
    /** Reading Part 4 — ghép tiêu đề với 7 đoạn văn. */
    private static final String READING_PART_4 = "16000000-0000-4000-8000-000000000014";

    /** Nội dung lựa chọn -> chữ số trong mã. */
    private static final Map<String, String> SPEAKER_DIGIT = Map.of(
            "Man", "1",
            "Woman", "2",
            "Both", "0");

    private final QuestionSetRepository questionSetRepository;
    private final QuestionSetDocumentRepository documentRepository;

    @GetMapping("/listening-part-3")
    @Transactional(readOnly = true)
    public List<StudyTipsDtos.SpeakerCodeResponse> listeningPart3() {
        List<QuestionSet> sets = questionSetRepository
                .findByPartIdAndStatusOrderByCodeAsc(LISTENING_PART_3, ContentStatus.PUBLISHED);

        Map<String, QuestionSetDocument> documents = loadDocuments(sets);

        return sets.stream()
                .map(set -> toCode(set, documents.get(set.getId())))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(StudyTipsDtos.SpeakerCodeResponse::title))
                .toList();
    }

    /**
     * Chuỗi tiêu đề đáp án của từng đề Reading Part 4.
     *
     * <p>Trả theo THỨ TỰ ĐOẠN VĂN chứ không theo thứ tự tiêu đề in trong đề:
     * học viên nhớ "đoạn 1 là definition, đoạn 2 là achievement…", nên chuỗi phải
     * khớp trình tự đọc.
     */
    @GetMapping("/reading-part-4")
    @Transactional(readOnly = true)
    public List<StudyTipsDtos.HeadingChainResponse> readingPart4() {
        List<QuestionSet> sets = questionSetRepository
                .findByPartIdAndStatusOrderByCodeAsc(READING_PART_4, ContentStatus.PUBLISHED);

        Map<String, QuestionSetDocument> documents = loadDocuments(sets);

        return sets.stream()
                .map(set -> toChain(set, documents.get(set.getId())))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(StudyTipsDtos.HeadingChainResponse::title))
                .toList();
    }

    /**
     * Chuỗi đáp án Reading Part 3: mỗi nhận định thuộc về người nói nào.
     *
     * <p>Dùng lại HeadingChainResponse vì cấu trúc giống nhau — chỉ khác ý nghĩa:
     * headings là nhãn người nói (A/B/C/D), passages là nội dung nhận định.
     */
    @GetMapping("/reading-part-3")
    @Transactional(readOnly = true)
    public List<StudyTipsDtos.HeadingChainResponse> readingPart3() {
        List<QuestionSet> sets = questionSetRepository
                .findByPartIdAndStatusOrderByCodeAsc(READING_PART_3, ContentStatus.PUBLISHED);

        Map<String, QuestionSetDocument> documents = loadDocuments(sets);

        return sets.stream()
                .map(set -> toChain(set, documents.get(set.getId())))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(StudyTipsDtos.HeadingChainResponse::title))
                .toList();
    }

    // -----------------------------------------------------------------

    private Map<String, QuestionSetDocument> loadDocuments(List<QuestionSet> sets) {
        return documentRepository
                .findByQuestionSetIdIn(sets.stream().map(QuestionSet::getId).toList())
                .stream()
                .collect(Collectors.toMap(
                        QuestionSetDocument::getQuestionSetId,
                        Function.identity(),
                        (a, b) -> a.getRevision() >= b.getRevision() ? a : b));
    }

    /**
     * Đề thiếu đáp án ghép thì bỏ qua: chuỗi khuyết một mắt xích còn hại hơn
     * không có chuỗi, vì học viên vẫn tin là đủ.
     */
    private StudyTipsDtos.HeadingChainResponse toChain(
            QuestionSet set, QuestionSetDocument document) {

        if (document == null || document.getItems() == null || document.getItems().isEmpty()) {
            return null;
        }
        QuestionSetDocument.Item item = document.getItems().get(0);
        if (item.getAnswerKey() == null || item.getAnswerKey().getMatches() == null) {
            return null;
        }

        // Part 4: nhãn là nội dung tiêu đề. Part 3: nội dung chỉ là "Person A" nên
        // dùng code (A/B/C/D) cho ngắn và đúng cách học viên ghi nhớ.
        Map<String, String> headingById = item.getRightItems().stream()
                .collect(Collectors.toMap(
                        QuestionSetDocument.Option::getId,
                        option -> {
                            String content = option.getContent();
                            boolean placeholder = content == null
                                    || content.isBlank()
                                    || content.trim().toLowerCase().startsWith("person ");
                            return placeholder ? option.getCode() : content;
                        }));

        List<String> headings = new ArrayList<>();
        List<String> passages = new ArrayList<>();
        for (QuestionSetDocument.Option paragraph : item.getLeftItems()) {
            String headingId = item.getAnswerKey().getMatches().get(paragraph.getId());
            String heading = headingId == null ? null : headingById.get(headingId);
            if (heading == null) {
                return null;
            }
            headings.add(heading);
            passages.add(paragraph.getContent());
        }
        if (headings.isEmpty()) {
            return null;
        }

        return new StudyTipsDtos.HeadingChainResponse(
                set.getId(),
                set.getCode(),
                document.getTitle(),
                headings,
                passages,
                set.getExamYear() == null ? null : set.getExamYear().intValue(),
                set.getHotness() == null ? null : set.getHotness().intValue());
    }

    /**
     * Đề nào không đủ bốn câu hoặc thiếu đáp án thì bỏ qua thay vì trả mã sai —
     * một chữ số sai làm học viên mất điểm mà không biết vì sao.
     */
    private StudyTipsDtos.SpeakerCodeResponse toCode(QuestionSet set, QuestionSetDocument document) {
        if (document == null || document.getItems() == null) {
            return null;
        }

        StringBuilder code = new StringBuilder();
        List<String> speakers = new ArrayList<>();

        for (QuestionSetDocument.Item item : document.getItems()) {
            if (item.getAnswerKey() == null || item.getAnswerKey().getSelectedOptionId() == null) {
                return null;
            }
            String selected = item.getAnswerKey().getSelectedOptionId();
            String speaker = item.getOptions().stream()
                    .filter(option -> selected.equals(option.getId()))
                    .map(QuestionSetDocument.Option::getContent)
                    .findFirst()
                    .orElse(null);

            String digit = speaker == null ? null : SPEAKER_DIGIT.get(speaker.trim());
            if (digit == null) {
                return null;
            }
            code.append(digit);
            speakers.add(speaker.trim());
        }

        if (code.length() != 4) {
            return null;
        }

        return new StudyTipsDtos.SpeakerCodeResponse(
                set.getId(),
                set.getCode(),
                document.getTitle(),
                code.toString(),
                speakers,
                set.getExamYear() == null ? null : set.getExamYear().intValue(),
                set.getHotness() == null ? null : set.getHotness().intValue());
    }
}
