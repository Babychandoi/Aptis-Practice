package vn.weconex.aptis.content.web;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.format.annotation.DateTimeFormat;
import vn.weconex.aptis.catalog.domain.ExamStructure.Component;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.domain.ExamStructure.Topic;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.TopicRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.content.domain.ExamPrediction;
import vn.weconex.aptis.content.repository.ExamPredictionRepository;
import vn.weconex.aptis.content.repository.QuestionSetRepository;

/**
 * Quản lý dự đoán đề. Dùng chung quyền với nội dung câu hỏi
 * ({@code question_set:write}) vì đây cũng là việc biên tập nội dung.
 */
@RestController
@RequestMapping("/api/v1/admin/exam-predictions")
@RequiredArgsConstructor
public class AdminExamPredictionController {

    private final ExamPredictionRepository repository;
    private final QuestionSetRepository questionSetRepository;
    private final TopicRepository topicRepository;
    private final PartRepository partRepository;
    private final ComponentRepository componentRepository;
    private final CurrentUser currentUser;

    /** Bỏ trống date thì trả toàn bộ, mới nhất trước. */
    @GetMapping
    @PreAuthorize("hasAuthority('question_set:write')")
    @Transactional(readOnly = true)
    public List<ExamPredictionDtos.AdminPredictionResponse> list(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        List<ExamPrediction> items = date == null
                ? repository.findAllByOrderByPredictDateDescDisplayOrderAsc()
                : repository.findByPredictDateOrderByDisplayOrderAscIdAsc(date);
        return toResponses(items);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('question_set:write')")
    @Transactional
    public ExamPredictionDtos.AdminPredictionResponse create(
            @Valid @RequestBody ExamPredictionDtos.SavePredictionRequest request) {

        ExamPrediction item = new ExamPrediction();
        apply(item, request);
        item.setCreatedBy(currentUser.requireUserId());
        return toResponses(List.of(repository.save(item))).get(0);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('question_set:write')")
    @Transactional
    public ExamPredictionDtos.AdminPredictionResponse update(
            @PathVariable String id,
            @Valid @RequestBody ExamPredictionDtos.SavePredictionRequest request) {

        ExamPrediction item = repository.findById(id)
                .orElseThrow(() -> ApiException.notFound("ExamPrediction", id));
        apply(item, request);
        return toResponses(List.of(repository.save(item))).get(0);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('question_set:write')")
    @Transactional
    public void delete(@PathVariable String id) {
        repository.deleteById(id);
    }

    private void apply(
            ExamPrediction item, ExamPredictionDtos.SavePredictionRequest request) {

        Topic topic = topicRepository.findById(request.topicId())
                .orElseThrow(() -> ApiException.notFound("Topic", request.topicId()));
        Component component = componentRepository.findById(request.componentId())
                .orElseThrow(() -> ApiException.notFound("Component", request.componentId()));

        // Part phải thuộc đúng kỹ năng: sai cặp thì lọc đề ra rỗng và học viên
        // bấm vào chỉ thấy lỗi.
        if (request.partId() != null && !request.partId().isBlank()) {
            Part part = partRepository.findById(request.partId())
                    .orElseThrow(() -> ApiException.notFound("Part", request.partId()));
            if (!component.getId().equals(part.getComponent().getId())) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED, "Part không thuộc kỹ năng đã chọn");
            }
            item.setPartId(part.getId());
        } else {
            item.setPartId(null);
        }

        item.setPredictDate(request.predictDate());
        item.setTopicId(topic.getId());
        item.setComponentId(component.getId());
        item.setPriority(parsePriority(request.priority()));
        item.setStatus(parseStatus(request.status()));
        item.setLabel(blankToNull(request.label()));
        item.setSectionLabel(blankToNull(request.sectionLabel()));
        item.setSource(blankToNull(request.source()));
        item.setDisplayOrder(request.displayOrder() == null ? 0 : request.displayOrder());
    }

    private List<ExamPredictionDtos.AdminPredictionResponse> toResponses(
            List<ExamPrediction> items) {

        if (items.isEmpty()) {
            return List.of();
        }

        Map<String, Topic> topics = index(
                topicRepository.findAllById(items.stream().map(ExamPrediction::getTopicId).distinct().toList()),
                Topic::getId);
        Map<String, Part> parts = index(
                partRepository.findAllById(items.stream()
                        .map(ExamPrediction::getPartId)
                        .filter(java.util.Objects::nonNull)
                        .distinct()
                        .toList()),
                Part::getId);
        Map<String, Component> components = index(
                componentRepository.findAllById(items.stream()
                        .map(ExamPrediction::getComponentId).distinct().toList()),
                Component::getId);

        // Một truy vấn cho cả danh sách; admin cần biết chủ đề nào chưa có đề.
        Map<String, Integer> byTopicAndPart = new HashMap<>();
        Map<String, Integer> byTopic = new HashMap<>();
        for (Object[] row : questionSetRepository.countPublishedByTopicAndPart(
                items.stream().map(ExamPrediction::getTopicId).distinct().toList())) {
            String topicId = (String) row[0];
            String partId = (String) row[1];
            int total = row[2] == null ? 0 : ((Number) row[2]).intValue();
            byTopicAndPart.merge(topicId + "|" + (partId == null ? "" : partId), total, Integer::sum);
            byTopic.merge(topicId, total, Integer::sum);
        }

        return items.stream()
                .map(item -> {
                    Topic topic = topics.get(item.getTopicId());
                    Part part = item.getPartId() == null ? null : parts.get(item.getPartId());
                    Component component = components.get(item.getComponentId());
                    int count = item.getPartId() == null
                            ? byTopic.getOrDefault(item.getTopicId(), 0)
                            : byTopicAndPart.getOrDefault(
                                    item.getTopicId() + "|" + item.getPartId(), 0);

                    return new ExamPredictionDtos.AdminPredictionResponse(
                            item.getId(),
                            item.getPredictDate(),
                            item.getTopicId(),
                            topic == null ? null : topic.getName(),
                            item.getPartId(),
                            part == null ? null : part.getName(),
                            item.getComponentId(),
                            component == null ? null : component.getCode(),
                            item.getPriority().name(),
                            item.getLabel(),
                            item.getSectionLabel(),
                            item.getSource(),
                            item.getStatus().name(),
                            item.getDisplayOrder(),
                            count);
                })
                .toList();
    }

    private static ExamPrediction.Priority parsePriority(String raw) {
        if (raw == null || raw.isBlank()) {
            return ExamPrediction.Priority.HOT;
        }
        try {
            return ExamPrediction.Priority.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException error) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Mức ưu tiên không hợp lệ: " + raw);
        }
    }

    private static ExamPrediction.PredictionStatus parseStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return ExamPrediction.PredictionStatus.PUBLISHED;
        }
        try {
            return ExamPrediction.PredictionStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException error) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Trạng thái không hợp lệ: " + raw);
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static <T> Map<String, T> index(
            List<T> list, java.util.function.Function<T, String> key) {
        Map<String, T> map = new HashMap<>();
        for (T item : list) {
            map.put(key.apply(item), item);
        }
        return map;
    }
}
