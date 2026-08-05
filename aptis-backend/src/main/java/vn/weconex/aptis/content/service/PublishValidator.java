package vn.weconex.aptis.content.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.asset.repository.AssetRepository;
import vn.weconex.aptis.catalog.domain.ExamStructure.TaskType;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;

/**
 * Kiểm tra nội dung trước khi publish (PHẦN X §60).
 *
 * <p>Trả về danh sách lỗi thay vì ném exception ở lỗi đầu tiên, để biên tập viên
 * sửa được hết trong một lượt.
 */
@Component
@RequiredArgsConstructor
public class PublishValidator {

    /** Dạng bài cần rubric vì không chấm tự động được. */
    private static final Set<String> RUBRIC_REQUIRED =
            Set.of("LONG_TEXT", "AUDIO_RECORDING");

    /** Dạng bài phải có answerKey để validator chấm. */
    private static final Set<String> ANSWER_KEY_REQUIRED = Set.of(
            "SINGLE_CHOICE", "GAP_FILL_CHOICE", "MULTIPLE_CHOICE",
            "MATCHING", "ORDERING", "SENTENCE_ORDERING", "SHORT_TEXT", "TEXT_EXACT");

    private final AssetRepository assetRepository;

    public List<String> validate(QuestionSet questionSet, QuestionSetDocument document) {
        List<String> errors = new ArrayList<>();

        validateMetadata(questionSet, errors);
        validateStructure(document, errors);
        validateItems(document, sectionIds(document), errors);
        validateAssets(document, errors);
        validateScore(questionSet, document, errors);

        return errors;
    }

    private void validateMetadata(QuestionSet questionSet, List<String> errors) {
        if (questionSet.getPart() == null) {
            errors.add("Thiếu Part");
        }
        TaskType taskType = questionSet.getTaskType();
        if (taskType == null) {
            errors.add("Thiếu task type");
        } else if (!taskType.isActive()) {
            errors.add("Task type " + taskType.getCode() + " đã bị vô hiệu hóa");
        }
        // access_level luôn có giá trị (NOT NULL + default) nên không cần kiểm tra
    }

    private void validateStructure(QuestionSetDocument document, List<String> errors) {
        if (isBlank(document.getInstructions())) {
            errors.add("Thiếu hướng dẫn làm bài (instructions)");
        }
        if (document.getItems().isEmpty()) {
            errors.add("Bộ câu hỏi không có câu nào");
        }
    }

    private void validateItems(
            QuestionSetDocument document, Set<String> sectionIds, List<String> errors) {

        Set<String> itemIds = new HashSet<>();

        for (QuestionSetDocument.Item item : document.getItems()) {
            String label = "Câu " + (item.getSequenceNo() > 0 ? item.getSequenceNo() : "?");

            if (isBlank(item.getId())) {
                errors.add(label + ": thiếu id");
            } else if (!itemIds.add(item.getId())) {
                errors.add(label + ": id trùng (" + item.getId() + ")");
            }

            if (isBlank(item.getResponseType())) {
                errors.add(label + ": thiếu responseType");
                continue;
            }
            if (item.getMaxScore() <= 0) {
                errors.add(label + ": maxScore phải lớn hơn 0");
            }

            validateOptionIds(item, label, errors);
            validateAnswerKey(item, sectionIds, label, errors);

            if (RUBRIC_REQUIRED.contains(item.getResponseType())
                    && isBlank(item.getRubricCode())) {
                errors.add(label + ": dạng " + item.getResponseType() + " phải có rubricCode");
            }
        }
    }

    private void validateOptionIds(
            QuestionSetDocument.Item item, String label, List<String> errors) {

        Set<String> seen = new HashSet<>();
        for (QuestionSetDocument.Option option : allOptions(item)) {
            if (isBlank(option.getId())) {
                errors.add(label + ": có phương án thiếu id");
            } else if (!seen.add(option.getId())) {
                errors.add(label + ": option id trùng (" + option.getId() + ")");
            }
        }
    }

    /**
     * Kiểm tra answer key tồn tại và mọi id nó tham chiếu đều có thật —
     * đáp án trỏ tới option không tồn tại là lỗi hay gặp khi sửa nội dung.
     */
    private void validateAnswerKey(
            QuestionSetDocument.Item item,
            Set<String> sectionIds,
            String label,
            List<String> errors) {

        String responseType = item.getResponseType();
        QuestionSetDocument.AnswerKey key = item.getAnswerKey();

        if (!ANSWER_KEY_REQUIRED.contains(responseType)) {
            return;
        }
        if (key == null) {
            errors.add(label + ": dạng " + responseType + " phải có answerKey");
            return;
        }

        Set<String> optionIds = new HashSet<>();
        allOptions(item).forEach(o -> optionIds.add(o.getId()));

        switch (responseType) {
            case "SINGLE_CHOICE", "GAP_FILL_CHOICE" -> {
                if (isBlank(key.getSelectedOptionId())) {
                    errors.add(label + ": thiếu selectedOptionId");
                } else if (!optionIds.contains(key.getSelectedOptionId())) {
                    errors.add(label + ": đáp án trỏ tới option không tồn tại ("
                            + key.getSelectedOptionId() + ")");
                }
            }
            case "MULTIPLE_CHOICE" -> {
                if (key.getSelectedOptionIds().isEmpty()) {
                    errors.add(label + ": thiếu selectedOptionIds");
                }
                key.getSelectedOptionIds().stream()
                        .filter(id -> !optionIds.contains(id))
                        .forEach(id -> errors.add(
                                label + ": đáp án trỏ tới option không tồn tại (" + id + ")"));
            }
            case "MATCHING" -> {
                if (key.getMatches().isEmpty()) {
                    errors.add(label + ": thiếu matches");
                }
                // Bên trái có thể là leftItems của item, hoặc sections của cả bộ
                // (heading matching: mỗi đoạn văn là một section)
                Set<String> leftIds = new HashSet<>(sectionIds);
                item.getLeftItems().forEach(o -> leftIds.add(o.getId()));

                key.getMatches().forEach((left, right) -> {
                    if (!leftIds.isEmpty() && !leftIds.contains(left)) {
                        errors.add(label + ": matches có khóa trái lạ (" + left + ")");
                    }
                    if (!optionIds.contains(right)) {
                        errors.add(label + ": matches trỏ tới option không tồn tại ("
                                + right + ")");
                    }
                });
            }
            case "ORDERING", "SENTENCE_ORDERING" -> {
                if (key.getOrderedOptionIds().isEmpty()) {
                    errors.add(label + ": thiếu orderedOptionIds");
                } else if (key.getOrderedOptionIds().size() != item.getOptions().size()) {
                    errors.add(label + ": orderedOptionIds phải liệt kê đủ "
                            + item.getOptions().size() + " phương án");
                }
                key.getOrderedOptionIds().stream()
                        .filter(id -> !optionIds.contains(id))
                        .forEach(id -> errors.add(
                                label + ": thứ tự trỏ tới option không tồn tại (" + id + ")"));
            }
            case "SHORT_TEXT", "TEXT_EXACT" -> {
                if (key.getAcceptedValues().isEmpty()) {
                    errors.add(label + ": thiếu acceptedValues");
                }
            }
            default -> { }
        }
    }

    /** Id các section — khóa trái hợp lệ cho heading matching. */
    private static Set<String> sectionIds(QuestionSetDocument document) {
        Set<String> ids = new HashSet<>();
        document.getSections().stream()
                .map(QuestionSetDocument.Section::getId)
                .filter(id -> id != null && !id.isBlank())
                .forEach(ids::add);
        return ids;
    }

    /**
     * Asset phải READY: nếu còn UPLOADING thì học viên sẽ gặp audio/ảnh lỗi.
     */
    private void validateAssets(QuestionSetDocument document, List<String> errors) {
        for (QuestionSetDocument.AssetRef ref : document.getAssets()) {
            if (isBlank(ref.getAssetId())) {
                errors.add("Có asset thiếu assetId");
                continue;
            }

            Asset asset = assetRepository.findById(ref.getAssetId()).orElse(null);
            if (asset == null) {
                errors.add("Asset không tồn tại: " + ref.getAssetId());
                continue;
            }
            if (!asset.isReady()) {
                errors.add("Asset chưa READY: " + ref.getAssetId()
                        + " (đang " + asset.getStatus() + ")");
            }
            // Audio phải có thời lượng để client hiển thị và kiểm soát số lần phát
            if (asset.getAssetType() == vn.weconex.aptis.common.util.Enums.AssetType.AUDIO
                    && asset.getDurationMs() == null) {
                errors.add("Audio thiếu thời lượng: " + ref.getAssetId());
            }
        }
    }

    /**
     * Điểm tối đa ở MySQL phải khớp tổng điểm các câu trong Mongo, nếu không
     * phần trăm điểm hiển thị cho học viên sẽ sai.
     */
    private void validateScore(
            QuestionSet questionSet, QuestionSetDocument document, List<String> errors) {

        double itemTotal = document.getItems().stream()
                .mapToDouble(QuestionSetDocument.Item::getMaxScore)
                .sum();

        if (itemTotal <= 0) {
            errors.add("Tổng điểm các câu phải lớn hơn 0");
            return;
        }

        double declared = questionSet.getMaxScore().doubleValue();
        if (Math.abs(declared - itemTotal) > 0.001) {
            errors.add("maxScore (%.2f) không khớp tổng điểm các câu (%.2f)"
                    .formatted(declared, itemTotal));
        }
    }

    private static List<QuestionSetDocument.Option> allOptions(QuestionSetDocument.Item item) {
        List<QuestionSetDocument.Option> all = new ArrayList<>(item.getOptions());
        all.addAll(item.getRightItems());
        return all;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
