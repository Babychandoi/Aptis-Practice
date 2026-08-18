package vn.weconex.aptis.platform.importexport;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.catalog.domain.ExamStructure.Component;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.catalog.repository.ExamVersionRepository;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.TaskTypeRepository;
import vn.weconex.aptis.catalog.repository.TopicRepository;
import vn.weconex.aptis.common.util.Enums.AccessLevel;
import vn.weconex.aptis.common.util.Enums.PublishStatus;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.content.service.AdminContentService;
import vn.weconex.aptis.content.web.AdminContentDtos;

/**
 * Biến dòng Excel thành bộ câu hỏi DRAFT.
 *
 * <p>Đi qua {@link AdminContentService} thay vì ghi trực tiếp: nhờ vậy nội dung
 * import chịu đúng ràng buộc như soạn tay (dẫn xuất itemCount/maxScore, ghi
 * revision, audit log), và luôn ở DRAFT chờ người duyệt — không tự publish nội
 * dung chưa ai xem.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionSetImporter {

    private final AdminContentService adminContentService;
    private final QuestionSetRepository questionSetRepository;
    private final ExamVersionRepository examVersionRepository;
    private final ComponentRepository componentRepository;
    private final PartRepository partRepository;
    private final TaskTypeRepository taskTypeRepository;
    private final TopicRepository topicRepository;

    public record ImportOutcome(int successCount, List<String> errors) {
    }

    /**
     * Gộp các dòng cùng code thành một bộ nhiều câu.
     */
    public Map<String, List<QuestionSetExcelParser.ParsedRow>> groupByCode(
            List<QuestionSetExcelParser.ParsedRow> rows) {

        Map<String, List<QuestionSetExcelParser.ParsedRow>> grouped = new LinkedHashMap<>();
        for (var row : rows) {
            grouped.computeIfAbsent(row.code(), key -> new ArrayList<>()).add(row);
        }
        return grouped;
    }

    /**
     * Ghi một bộ câu hỏi. Transaction riêng cho từng bộ: một bộ lỗi không làm mất
     * các bộ đã vào được (import một phần vẫn có giá trị).
     *
     * <p>Phải gọi qua proxy Spring từ bean khác ({@link ImportWorker}) —
     * gọi nội bộ sẽ bỏ qua transaction.
     */
    @Transactional
    public void importOne(
            String actorId, String code, List<QuestionSetExcelParser.ParsedRow> group) {

        if (questionSetRepository.existsByCode(code)) {
            throw new IllegalStateException("Mã bộ câu hỏi đã tồn tại");
        }

        QuestionSetExcelParser.ParsedRow first = group.get(0);
        Part part = resolvePart(first.componentCode(), first.partCode());

        // Task type gắn với cả bộ, không gắn từng câu. Trộn dạng trong cùng một
        // code sẽ khiến bộ được gán sai renderer, học viên thấy giao diện không
        // khớp với câu hỏi.
        List<String> distinctTypes = group.stream()
                .map(QuestionSetExcelParser.ParsedRow::taskType)
                .distinct()
                .toList();

        if (distinctTypes.size() > 1) {
            throw new IllegalStateException(
                    "Các dòng cùng code phải cùng task_type, đang có: "
                            + String.join(", ", distinctTypes));
        }

        String taskTypeCode = first.taskType();
        String taskTypeId = taskTypeRepository.findByCode(taskTypeCode)
                .orElseThrow(() -> new IllegalStateException(
                        "Thiếu task type " + taskTypeCode + " trong seed data"))
                .getId();

        String topicId = first.topicCode() == null
                ? null
                : topicRepository.findByCode(first.topicCode())
                        .map(topic -> topic.getId())
                        .orElseThrow(() -> new IllegalStateException(
                                "Không tìm thấy chủ đề " + first.topicCode()));

        List<AdminContentDtos.ItemPayload> items = new ArrayList<>();
        int sequence = 1;
        for (var row : group) {
            items.add(toItem(row, sequence++));
        }

        var request = new AdminContentDtos.CreateQuestionSetRequest(
                part.getId(),
                taskTypeId,
                topicId,
                null,
                code,
                first.title() == null ? code : first.title(),
                first.difficulty(),
                null,
                null,   // examYear — file import chưa có cột năm ra thi
                null,
                null,
                first.accessLevel() == null
                        ? AccessLevel.PREMIUM
                        : AccessLevel.valueOf(first.accessLevel()),
                null,
                new AdminContentDtos.ContentPayload(
                        first.instructions() == null
                                ? defaultInstructions(first.answerFormat())
                                : first.instructions(),
                        null,
                        List.of(),
                        items,
                        List.of(),
                        new AdminContentDtos.SettingsPayload(
                                false, false, null, false, true),
                        // Điểm từng phần bật theo cột partial_credit; chỉ nối cặp,
                        // sắp xếp và chọn nhiều đáp án mới dùng tới.
                        new AdminContentDtos.ScoringPayload(
                                "EXACT_MATCH", first.partialCredit())));

        adminContentService.create(actorId, request);
    }

    private AdminContentDtos.ItemPayload toItem(
            QuestionSetExcelParser.ParsedRow row, int sequenceNo) {

        String responseType = responseTypeOf(row.answerFormat());

        return new AdminContentDtos.ItemPayload(
                "item_" + sequenceNo,
                sequenceNo,
                new AdminContentDtos.RichContentPayload(null, "PLAIN_TEXT", row.prompt()),
                responseType,
                true,
                // Nối cặp tính điểm theo số cặp nên điểm tối đa bằng số cặp;
                // các dạng còn lại một câu một điểm.
                row.answerFormat() == QuestionSetExcelParser.AnswerFormat.MATCHES
                        ? (double) row.correctMatches().size()
                        : 1.0,
                toOptions(row.options()),
                toOptions(row.leftItems()),
                // Vế phải của câu nối cặp nằm ở options; rightItems để trống
                // tránh lặp dữ liệu ở hai chỗ rồi lệch nhau.
                List.of(),
                Map.of(),
                null,
                toAnswerKey(row, responseType),
                row.explanation() == null
                        ? null
                        : new AdminContentDtos.RichContentPayload(
                                null, "PLAIN_TEXT", row.explanation()));
    }

    private static List<AdminContentDtos.OptionPayload> toOptions(Map<String, String> values) {
        return values.entrySet().stream()
                .map(entry -> new AdminContentDtos.OptionPayload(
                        entry.getKey(), entry.getKey(), entry.getValue()))
                .toList();
    }

    /**
     * Answer key phải khớp đúng trường mà validator đọc, nếu không câu trả lời
     * đúng vẫn bị chấm 0.
     */
    private static AdminContentDtos.AnswerKeyPayload toAnswerKey(
            QuestionSetExcelParser.ParsedRow row, String responseType) {

        return switch (row.answerFormat()) {
            case SINGLE_OPTION -> new AdminContentDtos.AnswerKeyPayload(
                    responseType, row.correctOption(),
                    List.of(), Map.of(), List.of(), List.of(), false);

            case MULTIPLE_OPTIONS -> new AdminContentDtos.AnswerKeyPayload(
                    responseType, null,
                    row.correctOptions(), Map.of(), List.of(), List.of(), false);

            case MATCHES -> new AdminContentDtos.AnswerKeyPayload(
                    responseType, null,
                    List.of(), row.correctMatches(), List.of(), List.of(), false);

            case ORDER -> new AdminContentDtos.AnswerKeyPayload(
                    responseType, null,
                    List.of(), Map.of(), row.correctOrder(), List.of(), false);

            case TEXT -> new AdminContentDtos.AnswerKeyPayload(
                    responseType, null,
                    List.of(), Map.of(), List.of(),
                    row.acceptedAnswers(), row.caseSensitive());
        };
    }

    /**
     * responseType quyết định validator nào chấm (xem ScoringService), nên phải
     * là mã validator chứ không phải mã task type.
     */
    private static String responseTypeOf(QuestionSetExcelParser.AnswerFormat format) {
        return switch (format) {
            case SINGLE_OPTION -> "SINGLE_CHOICE";
            case MULTIPLE_OPTIONS -> "MULTIPLE_CHOICE";
            case MATCHES -> "MATCHING";
            case ORDER -> "SENTENCE_ORDERING";
            case TEXT -> "SHORT_TEXT";
        };
    }

    private static String defaultInstructions(QuestionSetExcelParser.AnswerFormat format) {
        return switch (format) {
            case SINGLE_OPTION -> "Chọn đáp án đúng.";
            case MULTIPLE_OPTIONS -> "Chọn tất cả đáp án đúng.";
            case MATCHES -> "Nối mỗi mục bên trái với mục tương ứng bên phải.";
            case ORDER -> "Sắp xếp các câu theo đúng thứ tự.";
            case TEXT -> "Viết câu trả lời ngắn.";
        };
    }

    /**
     * Part được tra theo (componentCode, partCode) trong exam version đang
     * PUBLISHED — file Excel dùng mã dễ đọc thay vì UUID.
     */
    private Part resolvePart(String componentCode, String partCode) {
        String examVersionId = examVersionRepository.findByStatus(PublishStatus.PUBLISHED).stream()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Chưa có exam version nào ở trạng thái PUBLISHED"))
                .getId();

        Component component = componentRepository
                .findByExamVersionIdAndCode(examVersionId, componentCode)
                .orElseThrow(() -> new IllegalStateException(
                        "Không tìm thấy học phần " + componentCode));

        return partRepository.findByComponentIdAndCode(component.getId(), partCode)
                .orElseThrow(() -> new IllegalStateException(
                        "Không tìm thấy Part " + partCode + " trong " + componentCode));
    }
}
