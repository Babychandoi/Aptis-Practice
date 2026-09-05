package vn.weconex.aptis.content.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.catalog.domain.ExamStructure.Component;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.domain.ExamStructure.Topic;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.TopicRepository;
import vn.weconex.aptis.content.domain.ExamPrediction;
import vn.weconex.aptis.content.repository.ExamPredictionRepository;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.content.web.ExamPredictionDtos;

/**
 * Dựng bản tin dự đoán đề cho học viên.
 *
 * <p>Gom dữ liệu bằng vài truy vấn cho cả trang thay vì mỗi mục một truy vấn:
 * một ngày có thể có hơn trăm mục (52 chủ đề Listening trong ảnh mẫu).
 */
@Service
@RequiredArgsConstructor
public class ExamPredictionService {

    private final ExamPredictionRepository predictionRepository;
    private final QuestionSetRepository questionSetRepository;
    private final TopicRepository topicRepository;
    private final PartRepository partRepository;
    private final ComponentRepository componentRepository;

    /**
     * Bản tin của một ngày.
     *
     * <p>Ngày yêu cầu chưa có tin thì lùi về ngày gần nhất có tin — admin không
     * nhập mỗi ngày, và trang trống thì học viên tưởng tính năng lỗi.
     */
    @Transactional(readOnly = true)
    public ExamPredictionDtos.PredictionFeedResponse feedFor(LocalDate date) {
        LocalDate effective = predictionRepository.findLatestDateUpTo(date).orElse(null);
        if (effective == null) {
            return new ExamPredictionDtos.PredictionFeedResponse(date, null, null, List.of());
        }

        // Hiện NGÀY ĐANG XEM chứ không phải ngày bản tin gốc: dự đoán còn nguyên
        // giá trị cho tới khi admin đăng bản mới, mà đề ngày cũ trông như tin đã
        // hết hạn nên học viên bỏ qua.
        List<ExamPrediction> items = predictionRepository.findPublishedByDate(effective);
        return build(date, effective, items, Map.of());
    }

    /**
     * Bản tin gộp nhiều ngày, kèm số lần lặp của từng chủ đề.
     *
     * <p>Dùng cho tab "đề hot nhất N tháng qua": chủ đề xuất hiện nhiều lần
     * trong các bản tin thì khả năng ra thi cao hơn. Mỗi cặp (chủ đề, part) chỉ
     * giữ MỘT mục — bản mới nhất — kèm số lần đã xuất hiện.
     */
    @Transactional(readOnly = true)
    public ExamPredictionDtos.PredictionFeedResponse hottestBetween(LocalDate from, LocalDate to) {
        List<ExamPrediction> all = predictionRepository.findPublishedBetween(from, to);
        if (all.isEmpty()) {
            return new ExamPredictionDtos.PredictionFeedResponse(to, to, null, List.of());
        }

        Map<String, Integer> repeats = new HashMap<>();
        Map<String, ExamPrediction> newest = new LinkedHashMap<>();
        for (ExamPrediction item : all) {
            String key = slotKey(item);
            repeats.merge(key, 1, Integer::sum);
            // findPublishedBetween đã sắp ngày giảm dần nên bản gặp đầu là mới nhất.
            newest.putIfAbsent(key, item);
        }

        List<ExamPrediction> unique = new ArrayList<>(newest.values());
        // Chủ đề lặp nhiều lên trước — đó là ý nghĩa của tab này.
        unique.sort(Comparator.comparingInt(
                (ExamPrediction p) -> -repeats.getOrDefault(slotKey(p), 0)));

        Map<String, Integer> byId = new HashMap<>();
        for (ExamPrediction item : unique) {
            byId.put(item.getId(), repeats.getOrDefault(slotKey(item), 0));
        }
        return build(to, to, unique, byId);
    }

    private static String slotKey(ExamPrediction item) {
        return item.getTopicId() + "|" + (item.getPartId() == null ? "" : item.getPartId());
    }

    /**
     * @param date       ngày hiển thị cho học viên
     * @param sourceDate ngày của bản tin gốc; bằng {@code date} khi bản tin đúng
     *                   ngày đang xem
     */
    private ExamPredictionDtos.PredictionFeedResponse build(
            LocalDate date,
            LocalDate sourceDate,
            List<ExamPrediction> items,
            Map<String, Integer> repeatByPredictionId) {

        if (items.isEmpty()) {
            return new ExamPredictionDtos.PredictionFeedResponse(date, sourceDate, null, List.of());
        }

        Map<String, Topic> topics = byId(
                topicRepository.findAllById(items.stream().map(ExamPrediction::getTopicId).distinct().toList()),
                Topic::getId);
        Map<String, Part> parts = byId(
                partRepository.findAllById(items.stream()
                        .map(ExamPrediction::getPartId)
                        .filter(java.util.Objects::nonNull)
                        .distinct()
                        .toList()),
                Part::getId);
        Map<String, Component> components = byId(
                componentRepository.findAllById(items.stream()
                        .map(ExamPrediction::getComponentId)
                        .distinct()
                        .toList()),
                Component::getId);

        QuestionSetStats stats = countQuestionSets(items);

        // Nhóm hai tầng: kỹ năng -> section, giữ nguyên thứ tự admin đặt.
        Map<String, Map<String, List<ExamPredictionDtos.PredictionItemResponse>>> grouped =
                new LinkedHashMap<>();
        for (ExamPrediction item : items) {
            // Bỏ hẳn mục chưa có đề: học viên bấm vào không làm được gì, hiện
            // ra chỉ gây thất vọng. Trang admin vẫn thấy đủ để biết mà bổ sung.
            if (stats.counts().getOrDefault(countKey(item), 0) == 0) {
                continue;
            }

            Topic topic = topics.get(item.getTopicId());
            String label = item.getLabel() != null && !item.getLabel().isBlank()
                    ? item.getLabel()
                    : (topic == null ? item.getTopicId() : topic.getName());

            String section = item.getSectionLabel() != null && !item.getSectionLabel().isBlank()
                    ? item.getSectionLabel()
                    : sectionFallback(parts.get(item.getPartId()));

            grouped
                    .computeIfAbsent(item.getComponentId(), key -> new LinkedHashMap<>())
                    .computeIfAbsent(section, key -> new ArrayList<>())
                    .add(new ExamPredictionDtos.PredictionItemResponse(
                            item.getId(),
                            item.getTopicId(),
                            item.getPartId(),
                            label,
                            item.getPriority().name(),
                            stats.counts().getOrDefault(countKey(item), 0),
                            repeatByPredictionId.getOrDefault(item.getId(), 0),
                            stats.partIds().getOrDefault(countKey(item), List.of())));
        }

        List<ExamPredictionDtos.PredictionSkillResponse> skills = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            Component component = components.get(entry.getKey());
            List<ExamPredictionDtos.PredictionSectionResponse> sections = entry.getValue().entrySet()
                    .stream()
                    .map(s -> new ExamPredictionDtos.PredictionSectionResponse(s.getKey(), s.getValue()))
                    .toList();
            int topicCount = sections.stream().mapToInt(s -> s.items().size()).sum();

            skills.add(new ExamPredictionDtos.PredictionSkillResponse(
                    entry.getKey(),
                    component == null ? "" : component.getCode(),
                    component == null ? "" : component.getName(),
                    component == null ? 0 : component.getDisplayOrder(),
                    topicCount,
                    sections));
        }
        skills.sort(Comparator.comparingInt(ExamPredictionDtos.PredictionSkillResponse::displayOrder));

        String source = items.stream()
                .map(ExamPrediction::getSource)
                .filter(s -> s != null && !s.isBlank())
                .findFirst()
                .orElse(null);

        return new ExamPredictionDtos.PredictionFeedResponse(date, sourceDate, source, skills);
    }

    /**
     * Số đề publish của từng mục.
     *
     * <p>Mục có partId thì đếm đúng part đó; mục để trống part thì cộng mọi part
     * của chủ đề, vì lúc làm bài cũng lọc theo cả kỹ năng.
     */
    private QuestionSetStats countQuestionSets(List<ExamPrediction> items) {
        List<String> topicIds = items.stream().map(ExamPrediction::getTopicId).distinct().toList();
        if (topicIds.isEmpty()) {
            return new QuestionSetStats(Map.of(), Map.of());
        }

        Map<String, Integer> byTopicAndPart = new HashMap<>();
        Map<String, Integer> byTopic = new HashMap<>();
        Map<String, List<String>> partsByTopic = new HashMap<>();
        for (Object[] row : questionSetRepository.countPublishedByTopicAndPart(topicIds)) {
            String topicId = (String) row[0];
            String partId = (String) row[1];
            int total = row[2] == null ? 0 : ((Number) row[2]).intValue();
            byTopicAndPart.merge(topicId + "|" + (partId == null ? "" : partId), total, Integer::sum);
            byTopic.merge(topicId, total, Integer::sum);
            if (partId != null) {
                partsByTopic.computeIfAbsent(topicId, key -> new ArrayList<>()).add(partId);
            }
        }

        Map<String, Integer> counts = new HashMap<>();
        Map<String, List<String>> parts = new HashMap<>();
        for (ExamPrediction item : items) {
            String key = countKey(item);
            if (item.getPartId() == null) {
                counts.put(key, byTopic.getOrDefault(item.getTopicId(), 0));
                parts.put(key, partsByTopic.getOrDefault(item.getTopicId(), List.of()));
            } else {
                counts.put(
                        key,
                        byTopicAndPart.getOrDefault(
                                item.getTopicId() + "|" + item.getPartId(), 0));
                parts.put(key, List.of(item.getPartId()));
            }
        }
        return new QuestionSetStats(counts, parts);
    }

    /** Số đề và danh sách part có đề, khoá theo {@link #countKey}. */
    private record QuestionSetStats(
            Map<String, Integer> counts, Map<String, List<String>> partIds) {
    }

    private static String countKey(ExamPrediction item) {
        return item.getTopicId() + "@" + (item.getPartId() == null ? "" : item.getPartId());
    }

    /** Không đặt section thì lấy tên part; không có part thì gộp vào "Chủ đề". */
    private static String sectionFallback(Part part) {
        return part == null ? "Chủ đề" : part.getName();
    }

    private static <T> Map<String, T> byId(List<T> list, java.util.function.Function<T, String> key) {
        Map<String, T> map = new HashMap<>();
        for (T item : list) {
            map.put(key.apply(item), item);
        }
        return map;
    }
}
