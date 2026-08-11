package vn.weconex.aptis.catalog.web;

import java.util.List;
import java.util.Map;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.catalog.domain.ExamStructure.Component;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.repository.ComponentRepository;
import vn.weconex.aptis.catalog.repository.ExamProductRepository;
import vn.weconex.aptis.catalog.repository.ExamVersionRepository;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.TopicRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.common.util.Enums.PublishStatus;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.content.service.ContentAccessService;

/**
 * API danh mục cho học viên.
 *
 * <p>Danh sách bộ câu hỏi trả kèm {@code canAccess} và {@code lockReason} để
 * frontend hiển thị ổ khóa (PHẦN V §43), nhưng KHÔNG trả nội dung chi tiết của
 * bài Premium khi chưa có quyền.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CatalogController {

    private final ExamProductRepository examProductRepository;
    private final ExamVersionRepository examVersionRepository;
    private final ComponentRepository componentRepository;
    private final PartRepository partRepository;
    private final TopicRepository topicRepository;
    private final QuestionSetRepository questionSetRepository;
    private final ContentAccessService contentAccessService;
    private final CurrentUser currentUser;

    @GetMapping("/exam-products")
    public List<CatalogDtos.ExamProductResponse> examProducts() {
        return examProductRepository.findByActiveTrue().stream()
                .map(p -> new CatalogDtos.ExamProductResponse(
                        p.getId(), p.getCode(), p.getName(), p.getDescription()))
                .toList();
    }

    @GetMapping("/exam-versions")
    @Transactional(readOnly = true)
    public List<CatalogDtos.ExamVersionResponse> examVersions(
            @RequestParam(required = false) String examProductId) {

        var versions = examProductId == null
                ? examVersionRepository.findByStatus(PublishStatus.PUBLISHED)
                : examVersionRepository.findByExamProductIdAndStatus(
                        examProductId, PublishStatus.PUBLISHED);

        return versions.stream()
                .map(v -> new CatalogDtos.ExamVersionResponse(
                        v.getId(), v.getCode(), v.getName(), v.getExamProduct().getId()))
                .toList();
    }

    @GetMapping("/components")
    public List<CatalogDtos.ComponentResponse> components(@RequestParam String examVersionId) {
        return componentRepository
                .findByExamVersionIdAndActiveTrueOrderByDisplayOrder(examVersionId).stream()
                .map(CatalogController::toComponentResponse)
                .toList();
    }

    @GetMapping("/components/{componentId}/parts")
    public List<CatalogDtos.PartResponse> parts(@PathVariable String componentId) {
        return partRepository.findByComponentIdAndActiveTrueOrderByDisplayOrder(componentId).stream()
                .map(part -> toPartResponse(part, questionSetRepository.countByPartIdAndStatus(
                        part.getId(), ContentStatus.PUBLISHED)))
                .toList();
    }

    @GetMapping("/parts/{partId}")
    @Transactional(readOnly = true)
    public CatalogDtos.PartResponse part(@PathVariable String partId) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> ApiException.notFound("Part", partId));

        return toPartResponse(part, questionSetRepository.countByPartIdAndStatus(
                partId, ContentStatus.PUBLISHED));
    }

    /**
     * Danh sách bộ câu hỏi của một Part, kèm trạng thái khóa.
     */
    @GetMapping("/parts/{partId}/question-sets")
    @Transactional(readOnly = true)
    public List<CatalogDtos.QuestionSetSummaryResponse> questionSets(
            @PathVariable String partId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        String userId = currentUser.requireUserId();

        List<QuestionSet> questionSets = questionSetRepository
                .findByPartIdAndStatus(
                        partId, ContentStatus.PUBLISHED, PageRequest.of(page, Math.min(size, 100)))
                .getContent();

        Map<String, ContentAccessService.AccessDecision> decisions =
                contentAccessService.evaluateAll(userId, questionSets);

        return questionSets.stream()
                .map(qs -> {
                    var decision = decisions.get(qs.getId());
                    return new CatalogDtos.QuestionSetSummaryResponse(
                            qs.getId(),
                            qs.getCode(),
                            qs.getTitle(),
                            qs.getTaskType().getCode(),
                            qs.getTopic() == null ? null : qs.getTopic().getName(),
                            qs.getHotness(),
                            qs.getItemCount(),
                            qs.getEstimatedSeconds(),
                            decision.effectiveLevel().name(),
                            decision.allowed(),
                            decision.lockReason());
                })
                .toList();
    }

    @GetMapping("/topics")
    public List<CatalogDtos.TopicResponse> topics() {
        return topicRepository.findByActiveTrue().stream()
                .map(t -> new CatalogDtos.TopicResponse(t.getId(), t.getCode(), t.getName()))
                .toList();
    }

    private static CatalogDtos.ComponentResponse toComponentResponse(Component component) {
        return new CatalogDtos.ComponentResponse(
                component.getId(),
                component.getCode(),
                component.getName(),
                component.getDescription(),
                component.getDisplayOrder(),
                component.getDurationSeconds(),
                component.getMaxScore() == null ? null : component.getMaxScore().doubleValue());
    }

    private static CatalogDtos.PartResponse toPartResponse(Part part, long publishedCount) {
        return new CatalogDtos.PartResponse(
                part.getId(),
                part.getComponent().getId(),
                part.getComponent().getCode(),
                part.getCode(),
                part.getName(),
                part.getDescription(),
                part.getInstructions(),
                part.getDisplayOrder(),
                part.getDefaultDurationSeconds(),
                publishedCount);
    }
}
