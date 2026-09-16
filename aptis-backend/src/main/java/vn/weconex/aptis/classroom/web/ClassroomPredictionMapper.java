package vn.weconex.aptis.classroom.web;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.domain.ExamStructure.Topic;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.TopicRepository;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction;
import vn.weconex.aptis.classroom.service.ClassroomContentService;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;

/**
 * Dựng DTO cho dự đoán đề của lớp.
 *
 * <p>Tách khỏi controller vì một mục dự đoán cần tra tên chủ đề, tên part, danh
 * sách đề gắn đích danh và số đề học viên mở được — gộp hết vào controller thì
 * hàm dài quá mức đọc nổi.
 *
 * <p>Mọi thứ nạp theo lô: gọi lẻ từng mục sẽ thành N+1 ngay với một lớp có vài
 * chục dự đoán.
 */
@Component
@RequiredArgsConstructor
public class ClassroomPredictionMapper {

    private final ComponentRepository componentRepository;
    private final TopicRepository topicRepository;
    private final PartRepository partRepository;
    private final QuestionSetRepository questionSetRepository;
    private final ClassroomContentService contentService;

    public List<ClassroomDtos.ClassroomPredictionResponse> toDtos(
            List<ClassroomPrediction> rows, String teacherUserId) {

        if (rows.isEmpty()) {
            return List.of();
        }

        Map<String, String> componentNames = namesByIds(
                rows.stream().map(ClassroomPrediction::getComponentId).toList(),
                ids -> componentRepository.findAllById(ids).stream()
                        .collect(Collectors.toMap(c -> c.getId(), c -> c.getName())));

        Map<String, String> topicNames = namesByIds(
                rows.stream().map(ClassroomPrediction::getTopicId).toList(),
                ids -> topicRepository.findAllById(ids).stream()
                        .collect(Collectors.toMap(Topic::getId, Topic::getName)));

        Map<String, String> partNames = namesByIds(
                rows.stream().map(ClassroomPrediction::getPartId).toList(),
                ids -> partRepository.findAllById(ids).stream()
                        .collect(Collectors.toMap(Part::getId, Part::getName)));

        Map<String, List<String>> gan = contentService.questionSetIdsOf(
                rows.stream().map(ClassroomPrediction::getId).toList());

        Map<String, QuestionSet> deGan = questionSetsById(gan);
        Map<String, Integer> demTheoChuDe = countByTopic(rows);

        return rows.stream()
                .map(row -> toDto(row, componentNames, topicNames, partNames,
                        gan.getOrDefault(row.getId(), List.of()), deGan,
                        demTheoChuDe, teacherUserId))
                .toList();
    }

    private ClassroomDtos.ClassroomPredictionResponse toDto(
            ClassroomPrediction row,
            Map<String, String> componentNames,
            Map<String, String> topicNames,
            Map<String, String> partNames,
            List<String> questionSetIds,
            Map<String, QuestionSet> deGan,
            Map<String, Integer> demTheoChuDe,
            String teacherUserId) {

        List<ClassroomDtos.PredictionQuestionSetResponse> sets = questionSetIds.stream()
                .map(deGan::get)
                .filter(Objects::nonNull)
                .map(qs -> new ClassroomDtos.PredictionQuestionSetResponse(
                        qs.getId(),
                        qs.getTitle(),
                        qs.getPart() == null ? "" : qs.getPart().getName(),
                        qs.getPart() == null || qs.getPart().getComponent() == null
                                ? "" : qs.getPart().getComponent().getName(),
                        teacherUserId != null && teacherUserId.equals(qs.getOwnerTeacherId())))
                .toList();

        // Đề mở được = đề chỉ đích danh + đề cùng chủ đề. Học viên bấm vào mục
        // dự đoán là thấy cả hai nhóm, nên con số phải cộng cả hai.
        int theoChuDe = row.getTopicId() == null
                ? 0
                : demTheoChuDe.getOrDefault(row.getTopicId(), 0);

        return new ClassroomDtos.ClassroomPredictionResponse(
                row.getId(),
                row.getComponentId(),
                lookup(componentNames, row.getComponentId()),
                row.getTopicId(),
                lookup(topicNames, row.getTopicId()),
                row.getPartId(),
                lookup(partNames, row.getPartId()),
                row.getPredictDate(),
                row.getPriority().name(),
                row.getLabel(),
                row.getSectionLabel(),
                row.getSource(),
                row.getStatus().name(),
                row.getDisplayOrder(),
                row.getTitle(),
                row.getContent(),
                sets,
                sets.size() + theoChuDe,
                row.getCreatedAt());
    }

    /** Đếm đề đã publish theo chủ đề, một truy vấn cho cả danh sách. */
    private Map<String, Integer> countByTopic(List<ClassroomPrediction> rows) {
        List<String> topicIds = rows.stream()
                .map(ClassroomPrediction::getTopicId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (topicIds.isEmpty()) {
            return Map.of();
        }

        return questionSetRepository.countPublishedByTopicAndPart(topicIds).stream()
                .collect(Collectors.toMap(
                        r -> (String) r[0],
                        r -> ((Number) r[2]).intValue(),
                        // Cùng chủ đề có đề ở nhiều part; cộng lại thành tổng.
                        Integer::sum));
    }

    private Map<String, QuestionSet> questionSetsById(Map<String, List<String>> gan) {
        List<String> ids = gan.values().stream().flatMap(List::stream).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return questionSetRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(QuestionSet::getId, Function.identity()));
    }

    /**
     * Tra tên theo danh sách id, bỏ qua null.
     *
     * <p>{@code Map.of()} ném NullPointerException khi tra bằng khoá null, mà
     * componentId/topicId/partId đều có thể null.
     */
    private static Map<String, String> namesByIds(
            List<String> rawIds, Function<List<String>, Map<String, String>> loader) {

        List<String> ids = rawIds.stream().filter(Objects::nonNull).distinct().toList();
        return ids.isEmpty() ? Map.of() : loader.apply(ids);
    }

    private static String lookup(Map<String, String> names, String id) {
        return id == null ? null : names.get(id);
    }
}
