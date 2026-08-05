package vn.weconex.aptis.content.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Component;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;

/**
 * Loại bỏ đáp án và lời giải trước khi trả nội dung cho học viên.
 *
 * <p>Đây là hàng rào bắt buộc: answer key không được rời khỏi backend trước khi
 * học viên nộp bài (PHẦN VII §51). Snapshot lưu trong attempt_documents vẫn giữ
 * answer key đầy đủ để chấm — chỉ bản trả ra API bị lược.
 */
@Component
public class QuestionSetSanitizer {

    /**
     * @param document   snapshot hoặc document gốc
     * @param revealAnswers true khi học viên đã nộp và được xem đáp án
     * @param shuffleSeed  seed để trộn ổn định giữa các lần gọi trong cùng attempt
     */
    public QuestionSetDocument sanitize(
            QuestionSetDocument document, boolean revealAnswers, Long shuffleSeed) {

        QuestionSetDocument copy = shallowCopy(document);

        // Chỉ trộn phương án khi bộ câu hỏi bật shuffleOptions
        Long optionSeed = document.getSettings().isShuffleOptions() ? shuffleSeed : null;

        List<QuestionSetDocument.Item> items = new ArrayList<>();
        for (QuestionSetDocument.Item source : document.getItems()) {
            items.add(sanitizeItem(source, revealAnswers, optionSeed));
        }

        if (document.getSettings().isShuffleItems() && shuffleSeed != null) {
            Collections.shuffle(items, new Random(shuffleSeed));
            // Giữ sequenceNo theo thứ tự hiển thị mới để client render đúng số câu
            for (int i = 0; i < items.size(); i++) {
                items.get(i).setSequenceNo(i + 1);
            }
        }

        copy.setItems(items);
        return copy;
    }

    private QuestionSetDocument.Item sanitizeItem(
            QuestionSetDocument.Item source, boolean revealAnswers, Long shuffleSeed) {

        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId(source.getId());
        item.setSequenceNo(source.getSequenceNo());
        item.setPrompt(source.getPrompt());
        item.setResponseType(source.getResponseType());
        item.setRequired(source.isRequired());
        item.setMaxScore(source.getMaxScore());
        item.setConstraints(source.getConstraints());
        item.setRubricCode(source.getRubricCode());

        item.setOptions(maybeShuffle(source.getOptions(), shuffleSeed, source.getId()));
        item.setLeftItems(new ArrayList<>(source.getLeftItems()));
        item.setRightItems(maybeShuffle(source.getRightItems(), shuffleSeed, source.getId()));

        if (revealAnswers) {
            item.setAnswerKey(source.getAnswerKey());
            item.setExplanation(source.getExplanation());
        }
        // else: answerKey và explanation để null

        return item;
    }

    /**
     * Trộn theo seed dẫn xuất từ itemId để mỗi câu có thứ tự riêng nhưng
     * lặp lại được khi client tải lại trang.
     */
    private List<QuestionSetDocument.Option> maybeShuffle(
            List<QuestionSetDocument.Option> options, Long shuffleSeed, String itemId) {

        List<QuestionSetDocument.Option> copy = new ArrayList<>(options);
        if (shuffleSeed != null && !copy.isEmpty()) {
            // itemId có thể null nếu nội dung thiếu id; dùng 0 để không vỡ request
            int itemSalt = itemId == null ? 0 : itemId.hashCode();
            Collections.shuffle(copy, new Random(shuffleSeed * 31 + itemSalt));
        }
        return copy;
    }

    private QuestionSetDocument shallowCopy(QuestionSetDocument source) {
        QuestionSetDocument copy = new QuestionSetDocument();
        copy.setId(source.getId());
        copy.setQuestionSetId(source.getQuestionSetId());
        copy.setRevision(source.getRevision());
        copy.setSchemaVersion(source.getSchemaVersion());
        copy.setPartId(source.getPartId());
        copy.setTaskTypeCode(source.getTaskTypeCode());
        copy.setTitle(source.getTitle());
        copy.setInstructions(source.getInstructions());
        copy.setAccessLevel(source.getAccessLevel());
        copy.setStimulus(source.getStimulus());
        copy.setSections(source.getSections());
        copy.setAssets(source.getAssets());
        copy.setSettings(source.getSettings());
        copy.setScoring(source.getScoring());
        return copy;
    }
}
