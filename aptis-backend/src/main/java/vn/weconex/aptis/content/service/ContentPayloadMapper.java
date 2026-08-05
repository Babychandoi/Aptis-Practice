package vn.weconex.aptis.content.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.web.AdminContentDtos;

/**
 * Chuyển đổi giữa payload của admin API và document MongoDB.
 *
 * <p>Viết tay thay vì dùng mapper tự động: nội dung câu hỏi có nhiều trường tùy
 * dạng bài, và chỗ này cần kiểm soát rõ giá trị mặc định.
 */
@Component
public class ContentPayloadMapper {

    public QuestionSetDocument toDocument(
            String questionSetId,
            int revision,
            String partId,
            String taskTypeCode,
            String title,
            String accessLevel,
            AdminContentDtos.ContentPayload payload) {

        QuestionSetDocument document = new QuestionSetDocument();
        document.setId(questionSetId);
        document.setQuestionSetId(questionSetId);
        document.setRevision(revision);
        document.setSchemaVersion(1);
        document.setPartId(partId);
        document.setTaskTypeCode(taskTypeCode);
        document.setTitle(title);
        document.setInstructions(payload.instructions());
        document.setAccessLevel(accessLevel);
        document.setStimulus(toRichContent(payload.stimulus()));

        document.setSections(nullSafe(payload.sections()).stream()
                .map(ContentPayloadMapper::toSection)
                .toList());

        document.setItems(nullSafe(payload.items()).stream()
                .map(ContentPayloadMapper::toItem)
                .toList());

        document.setAssets(nullSafe(payload.assets()).stream()
                .map(ContentPayloadMapper::toAssetRef)
                .toList());

        document.setSettings(toSettings(payload.settings()));
        document.setScoring(toScoring(payload.scoring(), document.getItems()));

        return document;
    }

    public AdminContentDtos.ContentPayload toPayload(QuestionSetDocument document) {
        return new AdminContentDtos.ContentPayload(
                document.getInstructions(),
                fromRichContent(document.getStimulus()),
                document.getSections().stream()
                        .map(s -> new AdminContentDtos.SectionPayload(
                                s.getId(), s.getLabel(), fromRichContent(s.getContent())))
                        .toList(),
                document.getItems().stream().map(ContentPayloadMapper::fromItem).toList(),
                document.getAssets().stream()
                        .map(a -> new AdminContentDtos.AssetRefPayload(
                                a.getAssetId(), a.getRole(), a.getDisplayOrder()))
                        .toList(),
                new AdminContentDtos.SettingsPayload(
                        document.getSettings().isShuffleOptions(),
                        document.getSettings().isShuffleItems(),
                        document.getSettings().getMaxAudioPlays(),
                        document.getSettings().isShowAnswerAfterEachItem(),
                        document.getSettings().isAllowReview()),
                new AdminContentDtos.ScoringPayload(
                        document.getScoring().getStrategy(),
                        document.getScoring().isPartialCredit()));
    }

    // ---------- payload -> document ----------

    private static QuestionSetDocument.RichContent toRichContent(
            AdminContentDtos.RichContentPayload payload) {

        if (payload == null || payload.value() == null) {
            return null;
        }
        QuestionSetDocument.RichContent content = new QuestionSetDocument.RichContent();
        content.setType(payload.type());
        content.setFormat(payload.format() == null ? "PLAIN_TEXT" : payload.format());
        content.setValue(payload.value());
        return content;
    }

    private static QuestionSetDocument.Section toSection(AdminContentDtos.SectionPayload payload) {
        QuestionSetDocument.Section section = new QuestionSetDocument.Section();
        section.setId(payload.id());
        section.setLabel(payload.label());
        section.setContent(toRichContent(payload.content()));
        return section;
    }

    private static QuestionSetDocument.Option toOption(AdminContentDtos.OptionPayload payload) {
        QuestionSetDocument.Option option = new QuestionSetDocument.Option();
        option.setId(payload.id());
        option.setCode(payload.code());
        option.setContent(payload.content());
        return option;
    }

    private static QuestionSetDocument.Item toItem(AdminContentDtos.ItemPayload payload) {
        QuestionSetDocument.Item item = new QuestionSetDocument.Item();
        item.setId(payload.id());
        item.setSequenceNo(payload.sequenceNo());
        item.setPrompt(toRichContent(payload.prompt()));
        item.setResponseType(payload.responseType());
        item.setRequired(payload.required() == null || payload.required());
        item.setMaxScore(payload.maxScore() == null ? 1 : payload.maxScore());

        item.setOptions(mapOptions(payload.options()));
        item.setLeftItems(mapOptions(payload.leftItems()));
        item.setRightItems(mapOptions(payload.rightItems()));

        item.setConstraints(payload.constraints() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(payload.constraints()));
        item.setRubricCode(payload.rubricCode());
        item.setAnswerKey(toAnswerKey(payload.answerKey()));
        item.setExplanation(toRichContent(payload.explanation()));
        return item;
    }

    private static List<QuestionSetDocument.Option> mapOptions(
            List<AdminContentDtos.OptionPayload> payloads) {

        return nullSafe(payloads).stream().map(ContentPayloadMapper::toOption).toList();
    }

    private static QuestionSetDocument.AnswerKey toAnswerKey(
            AdminContentDtos.AnswerKeyPayload payload) {

        if (payload == null) {
            return null;
        }
        QuestionSetDocument.AnswerKey key = new QuestionSetDocument.AnswerKey();
        key.setType(payload.type());
        key.setSelectedOptionId(payload.selectedOptionId());
        key.setSelectedOptionIds(new ArrayList<>(nullSafe(payload.selectedOptionIds())));
        key.setMatches(payload.matches() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(payload.matches()));
        key.setOrderedOptionIds(new ArrayList<>(nullSafe(payload.orderedOptionIds())));
        key.setAcceptedValues(new ArrayList<>(nullSafe(payload.acceptedValues())));
        key.setCaseSensitive(payload.caseSensitive() != null && payload.caseSensitive());
        return key;
    }

    private static QuestionSetDocument.AssetRef toAssetRef(
            AdminContentDtos.AssetRefPayload payload) {

        QuestionSetDocument.AssetRef ref = new QuestionSetDocument.AssetRef();
        ref.setAssetId(payload.assetId());
        ref.setRole(payload.role() == null ? "ATTACHMENT" : payload.role());
        ref.setDisplayOrder(payload.displayOrder() == null ? 1 : payload.displayOrder());
        return ref;
    }

    private static QuestionSetDocument.Settings toSettings(
            AdminContentDtos.SettingsPayload payload) {

        QuestionSetDocument.Settings settings = new QuestionSetDocument.Settings();
        if (payload == null) {
            return settings;
        }
        settings.setShuffleOptions(Boolean.TRUE.equals(payload.shuffleOptions()));
        settings.setShuffleItems(Boolean.TRUE.equals(payload.shuffleItems()));
        settings.setMaxAudioPlays(payload.maxAudioPlays());
        settings.setShowAnswerAfterEachItem(
                Boolean.TRUE.equals(payload.showAnswerAfterEachItem()));
        settings.setAllowReview(payload.allowReview() == null || payload.allowReview());
        return settings;
    }

    /**
     * maxScore của cả bộ luôn tính từ tổng điểm các câu — không nhận từ client
     * để không lệch với dữ liệu chấm.
     */
    private static QuestionSetDocument.Scoring toScoring(
            AdminContentDtos.ScoringPayload payload, List<QuestionSetDocument.Item> items) {

        QuestionSetDocument.Scoring scoring = new QuestionSetDocument.Scoring();
        scoring.setStrategy(Optional.ofNullable(payload)
                .map(AdminContentDtos.ScoringPayload::strategy)
                .orElse("EXACT_MATCH"));
        scoring.setPartialCredit(payload != null && Boolean.TRUE.equals(payload.partialCredit()));
        scoring.setMaxScore(items.stream()
                .mapToDouble(QuestionSetDocument.Item::getMaxScore)
                .sum());
        return scoring;
    }

    // ---------- document -> payload ----------

    private static AdminContentDtos.RichContentPayload fromRichContent(
            QuestionSetDocument.RichContent content) {

        return content == null
                ? null
                : new AdminContentDtos.RichContentPayload(
                        content.getType(), content.getFormat(), content.getValue());
    }

    private static AdminContentDtos.ItemPayload fromItem(QuestionSetDocument.Item item) {
        return new AdminContentDtos.ItemPayload(
                item.getId(),
                item.getSequenceNo(),
                fromRichContent(item.getPrompt()),
                item.getResponseType(),
                item.isRequired(),
                item.getMaxScore(),
                fromOptions(item.getOptions()),
                fromOptions(item.getLeftItems()),
                fromOptions(item.getRightItems()),
                item.getConstraints(),
                item.getRubricCode(),
                fromAnswerKey(item.getAnswerKey()),
                fromRichContent(item.getExplanation()));
    }

    private static List<AdminContentDtos.OptionPayload> fromOptions(
            List<QuestionSetDocument.Option> options) {

        return options.stream()
                .map(o -> new AdminContentDtos.OptionPayload(
                        o.getId(), o.getCode(), o.getContent()))
                .toList();
    }

    private static AdminContentDtos.AnswerKeyPayload fromAnswerKey(
            QuestionSetDocument.AnswerKey key) {

        return key == null
                ? null
                : new AdminContentDtos.AnswerKeyPayload(
                        key.getType(),
                        key.getSelectedOptionId(),
                        key.getSelectedOptionIds(),
                        key.getMatches(),
                        key.getOrderedOptionIds(),
                        key.getAcceptedValues(),
                        key.isCaseSensitive());
    }

    private static <T> List<T> nullSafe(List<T> list) {
        return list == null ? List.of() : list;
    }
}
