package vn.weconex.aptis.content.service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.catalog.domain.ExamStructure.Part;
import vn.weconex.aptis.catalog.domain.ExamStructure.TaskType;
import vn.weconex.aptis.catalog.domain.ExamStructure.Topic;
import vn.weconex.aptis.catalog.repository.PartRepository;
import vn.weconex.aptis.catalog.repository.TaskTypeRepository;
import vn.weconex.aptis.catalog.repository.TopicRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.mongo.QuestionSetDocument;
import vn.weconex.aptis.content.mongo.QuestionSetDocumentRepository;
import vn.weconex.aptis.content.mongo.QuestionSetRevision;
import vn.weconex.aptis.content.mongo.QuestionSetRevisionRepository;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.content.web.AdminContentDtos;
import vn.weconex.aptis.platform.audit.AuditService;

/**
 * Soạn, duyệt và xuất bản câu hỏi (PHẦN X §59-60).
 *
 * <p>Vòng đời: DRAFT → IN_REVIEW → PUBLISHED → SUSPENDED/ARCHIVED.
 *
 * <p>Thứ tự ghi khi publish theo §54: lưu Mongo trước, tạo revision, tính
 * checksum, rồi mới cập nhật MySQL. Nếu bước MySQL lỗi thì nội dung Mongo vẫn
 * chưa được coi là publish vì MySQL là nguồn quyết định.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminContentService {

    private final QuestionSetRepository questionSetRepository;
    private final QuestionSetDocumentRepository documentRepository;
    private final QuestionSetRevisionRepository revisionRepository;
    private final PartRepository partRepository;
    private final TaskTypeRepository taskTypeRepository;
    private final TopicRepository topicRepository;
    private final ContentPayloadMapper mapper;
    private final PublishValidator publishValidator;
    private final QuestionSetSanitizer sanitizer;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    // -----------------------------------------------------------------
    // Tạo & sửa
    // -----------------------------------------------------------------

    @Transactional
    public QuestionSet create(String actorId, AdminContentDtos.CreateQuestionSetRequest request) {
        if (questionSetRepository.existsByCode(request.code())) {
            throw new ApiException(
                    ErrorCode.CONFLICT,
                    "Mã bộ câu hỏi đã tồn tại: " + request.code(),
                    Map.of("code", request.code()));
        }

        Part part = partRepository.findById(request.partId())
                .orElseThrow(() -> ApiException.notFound("Part", request.partId()));
        TaskType taskType = taskTypeRepository.findById(request.taskTypeId())
                .orElseThrow(() -> ApiException.notFound("TaskType", request.taskTypeId()));

        QuestionSet questionSet = new QuestionSet();
        questionSet.setId(UUID.randomUUID().toString());
        questionSet.setPart(part);
        questionSet.setTaskType(taskType);
        questionSet.setTopic(resolveTopic(request.topicId(), request.topicName()));
        questionSet.setCode(request.code());
        questionSet.setTitle(request.title());
        questionSet.setDifficulty(toByte(request.difficulty()));
        questionSet.setHotness(toByte(request.hotness()));
        questionSet.setExamYear(toShort(request.examYear()));
        questionSet.setCefrMin(request.cefrMin());
        questionSet.setCefrMax(request.cefrMax());
        questionSet.setAccessLevel(request.accessLevel());
        questionSet.setEstimatedSeconds(request.estimatedSeconds());
        questionSet.setStatus(ContentStatus.DRAFT);
        questionSet.setCreatedBy(actorId);
        questionSet.setUpdatedBy(actorId);

        // Ghi Mongo trước để MySQL không bao giờ trỏ tới nội dung không tồn tại
        QuestionSetDocument document = buildDocument(questionSet, 1, request.content());
        applyContentMetrics(questionSet, document);
        documentRepository.save(document);

        QuestionSet saved = questionSetRepository.save(questionSet);
        auditService.record(actorId, "QUESTION_SET_CREATE", "QUESTION_SET", saved.getId(),
                null, Map.of("code", saved.getCode(), "status", "DRAFT"));

        log.info("Đã tạo question set {} ({})", saved.getCode(), saved.getId());
        return saved;
    }

    /**
     * Chỉ sửa được ở DRAFT hoặc IN_REVIEW. Bài đã PUBLISHED phải chuyển sang
     * SUSPENDED trước — attempt đang chạy dùng snapshot nên không bị ảnh hưởng,
     * nhưng vẫn cần bước xác nhận có ý thức.
     */
    @Transactional
    public QuestionSet update(
            String actorId, String questionSetId, AdminContentDtos.UpdateQuestionSetRequest request) {

        QuestionSet questionSet = require(questionSetId);
        requireEditable(questionSet);

        Map<String, Object> before = snapshotForAudit(questionSet);

        if (request.topicId() != null || request.topicName() != null) {
            questionSet.setTopic(resolveTopic(request.topicId(), request.topicName()));
        }
        if (request.title() != null) {
            questionSet.setTitle(request.title());
        }
        if (request.difficulty() != null) {
            questionSet.setDifficulty(toByte(request.difficulty()));
        }
        if (request.hotness() != null) {
            questionSet.setHotness(toByte(request.hotness()));
        }
        if (request.examYear() != null) {
            questionSet.setExamYear(toShort(request.examYear()));
        }
        if (request.cefrMin() != null) {
            questionSet.setCefrMin(request.cefrMin());
        }
        if (request.cefrMax() != null) {
            questionSet.setCefrMax(request.cefrMax());
        }
        if (request.accessLevel() != null) {
            questionSet.setAccessLevel(request.accessLevel());
        }
        if (request.estimatedSeconds() != null) {
            questionSet.setEstimatedSeconds(request.estimatedSeconds());
        }
        questionSet.setUpdatedBy(actorId);

        if (request.content() != null) {
            // Bản nháp ghi đè cùng revision; revision chỉ tăng khi publish
            QuestionSetDocument document = buildDocument(
                    questionSet, questionSet.getCurrentRevision(), request.content());
            applyContentMetrics(questionSet, document);
            documentRepository.save(document);
        }

        auditService.record(actorId, "QUESTION_SET_UPDATE", "QUESTION_SET", questionSetId,
                before, snapshotForAudit(questionSet));

        return questionSet;
    }

    // -----------------------------------------------------------------
    // Chuyển trạng thái
    // -----------------------------------------------------------------

    @Transactional
    public QuestionSet submitForReview(String actorId, String questionSetId, String note) {
        QuestionSet questionSet = require(questionSetId);
        transition(questionSet, ContentStatus.IN_REVIEW);
        questionSet.setUpdatedBy(actorId);

        auditService.record(actorId, "QUESTION_SET_SUBMIT_REVIEW", "QUESTION_SET", questionSetId,
                null, Map.of("note", note == null ? "" : note));
        return questionSet;
    }

    /**
     * Trả về DRAFT khi reviewer yêu cầu sửa.
     */
    @Transactional
    public QuestionSet requestChanges(String actorId, String questionSetId, String note) {
        QuestionSet questionSet = require(questionSetId);
        transition(questionSet, ContentStatus.DRAFT);
        questionSet.setUpdatedBy(actorId);

        auditService.record(actorId, "QUESTION_SET_REQUEST_CHANGES", "QUESTION_SET", questionSetId,
                null, Map.of("note", note == null ? "" : note));
        return questionSet;
    }

    /**
     * Publish: validate → tăng revision → lưu Mongo + revision → cập nhật MySQL.
     *
     * @return kết quả kèm danh sách lỗi; {@code errors} rỗng nghĩa là đã publish
     */
    @Transactional
    public AdminContentDtos.PublishResultResponse publish(
            String actorId, String questionSetId, String note) {

        QuestionSet questionSet = require(questionSetId);

        if (!questionSet.canTransitionTo(ContentStatus.PUBLISHED)) {
            throw new ApiException(
                    ErrorCode.INVALID_CONTENT_STATE_TRANSITION,
                    "Không thể publish từ trạng thái " + questionSet.getStatus(),
                    Map.of("currentStatus", questionSet.getStatus()));
        }

        QuestionSetDocument current = documentRepository
                .findByQuestionSetIdAndRevision(questionSetId, questionSet.getCurrentRevision())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.QUESTION_SET_CONTENT_MISSING,
                        "Thiếu nội dung MongoDB cho " + questionSetId));

        List<String> errors = publishValidator.validate(questionSet, current);
        if (!errors.isEmpty()) {
            log.info("Publish {} bị chặn bởi {} lỗi validate", questionSet.getCode(), errors.size());
            return new AdminContentDtos.PublishResultResponse(
                    questionSetId,
                    questionSet.getStatus().name(),
                    questionSet.getCurrentRevision(),
                    questionSet.getContentChecksum(),
                    errors);
        }

        // Lần publish đầu giữ revision 1; các lần sau tăng để attempt cũ vẫn trỏ
        // đúng bản nội dung nó đã snapshot
        int newRevision = questionSet.getPublishedAt() == null
                ? questionSet.getCurrentRevision()
                : questionSet.getCurrentRevision() + 1;

        if (newRevision != current.getRevision()) {
            current.setRevision(newRevision);
            current.setId(questionSetId);
            documentRepository.save(current);
        }

        revisionRepository.save(QuestionSetRevision.of(
                current, note == null ? "Published" : note, actorId));

        String checksum = checksum(current);
        questionSet.publish(newRevision, checksum);
        questionSet.setUpdatedBy(actorId);

        auditService.record(actorId, "QUESTION_SET_PUBLISH", "QUESTION_SET", questionSetId,
                null, Map.of("revision", newRevision, "checksum", checksum));

        log.info("Đã publish {} revision {}", questionSet.getCode(), newRevision);
        return new AdminContentDtos.PublishResultResponse(
                questionSetId, ContentStatus.PUBLISHED.name(), newRevision, checksum, List.of());
    }

    @Transactional
    public QuestionSet suspend(String actorId, String questionSetId, String note) {
        QuestionSet questionSet = require(questionSetId);
        transition(questionSet, ContentStatus.SUSPENDED);
        questionSet.setUpdatedBy(actorId);

        auditService.record(actorId, "QUESTION_SET_SUSPEND", "QUESTION_SET", questionSetId,
                null, Map.of("note", note == null ? "" : note));
        return questionSet;
    }

    @Transactional
    public QuestionSet archive(String actorId, String questionSetId, String note) {
        QuestionSet questionSet = require(questionSetId);
        transition(questionSet, ContentStatus.ARCHIVED);
        questionSet.setUpdatedBy(actorId);

        auditService.record(actorId, "QUESTION_SET_ARCHIVE", "QUESTION_SET", questionSetId,
                null, Map.of("note", note == null ? "" : note));
        return questionSet;
    }

    // -----------------------------------------------------------------
    // Đọc
    // -----------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<QuestionSet> search(
            String partId, ContentStatus status, String code, Pageable pageable) {

        return questionSetRepository.findAll(
                AdminQuestionSetSpecifications.forSearch(partId, status, code), pageable);
    }

    @Transactional(readOnly = true)
    public AdminContentDtos.ContentPayload loadContent(QuestionSet questionSet) {
        return documentRepository
                .findByQuestionSetIdAndRevision(questionSet.getId(), questionSet.getCurrentRevision())
                .map(mapper::toPayload)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<AdminContentDtos.RevisionSummaryResponse> revisions(String questionSetId) {
        return revisionRepository.findByQuestionSetIdOrderByRevisionDesc(questionSetId).stream()
                .map(r -> new AdminContentDtos.RevisionSummaryResponse(
                        r.getRevision(), r.getChangeSummary(), r.getCreatedBy(), r.getCreatedAt()))
                .toList();
    }

    /**
     * Xem trước đúng bản học viên sẽ thấy — đã lược answer key. Dùng để biên tập
     * viên tự kiểm tra không lộ đáp án.
     */
    @Transactional(readOnly = true)
    public AdminContentDtos.PreviewResponse preview(String questionSetId, boolean revealAnswers) {
        QuestionSet questionSet = require(questionSetId);
        QuestionSetDocument document = documentRepository
                .findByQuestionSetIdAndRevision(questionSetId, questionSet.getCurrentRevision())
                .orElseThrow(() -> new ApiException(
                        ErrorCode.QUESTION_SET_CONTENT_MISSING,
                        "Thiếu nội dung MongoDB cho " + questionSetId));

        return new AdminContentDtos.PreviewResponse(
                questionSetId,
                document.getRevision(),
                !revealAnswers,
                sanitizer.sanitize(document, revealAnswers, null));
    }

    @Transactional(readOnly = true)
    public QuestionSet require(String questionSetId) {
        return questionSetRepository.findById(questionSetId)
                .orElseThrow(() -> ApiException.notFound("QuestionSet", questionSetId));
    }

    // -----------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------

    private QuestionSetDocument buildDocument(
            QuestionSet questionSet, int revision, AdminContentDtos.ContentPayload payload) {

        return mapper.toDocument(
                questionSet.getId(),
                revision,
                questionSet.getPart().getId(),
                questionSet.getTaskType().getCode(),
                questionSet.getTitle(),
                questionSet.getAccessLevel().name(),
                payload);
    }

    /**
     * item_count và max_score ở MySQL luôn dẫn xuất từ nội dung Mongo để hai bên
     * không lệch nhau.
     */
    private void applyContentMetrics(QuestionSet questionSet, QuestionSetDocument document) {
        questionSet.setItemCount(document.getItems().size());
        questionSet.setMaxScore(BigDecimal.valueOf(document.getItems().stream()
                .mapToDouble(QuestionSetDocument.Item::getMaxScore)
                .sum()));
    }

    private void transition(QuestionSet questionSet, ContentStatus target) {
        if (!questionSet.canTransitionTo(target)) {
            throw new ApiException(
                    ErrorCode.INVALID_CONTENT_STATE_TRANSITION,
                    "Không thể chuyển từ " + questionSet.getStatus() + " sang " + target,
                    Map.of("currentStatus", questionSet.getStatus(), "targetStatus", target));
        }
        questionSet.setStatus(target);
    }

    private void requireEditable(QuestionSet questionSet) {
        ContentStatus status = questionSet.getStatus();
        if (status != ContentStatus.DRAFT && status != ContentStatus.IN_REVIEW) {
            throw new ApiException(
                    ErrorCode.INVALID_CONTENT_STATE_TRANSITION,
                    "Chỉ sửa được nội dung ở DRAFT hoặc IN_REVIEW, hiện tại là " + status,
                    Map.of("currentStatus", status));
        }
    }

    private Topic resolveTopic(String topicId, String topicName) {
        if (topicName != null && !topicName.isBlank()) {
            String normalizedName = topicName.trim();
            return topicRepository.findFirstByNameIgnoreCase(normalizedName)
                    .orElseGet(() -> {
                        Topic topic = new Topic();
                        topic.setCode("CUSTOM_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
                        topic.setName(normalizedName);
                        topic.setActive(true);
                        return topicRepository.save(topic);
                    });
        }
        if (topicId == null || topicId.isBlank()) return null;
        return topicRepository.findById(topicId)
                .orElseThrow(() -> ApiException.notFound("Topic", topicId));
    }

    /**
     * Checksum để phát hiện nội dung Mongo bị sửa ngoài luồng ứng dụng (§54).
     */
    private String checksum(QuestionSetDocument document) {
        try {
            byte[] json = objectMapper.writeValueAsBytes(document);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json));
        } catch (Exception ex) {
            throw new IllegalStateException("Không tính được checksum nội dung", ex);
        }
    }

    private Map<String, Object> snapshotForAudit(QuestionSet questionSet) {
        return Map.of(
                "title", Optional.ofNullable(questionSet.getTitle()).orElse(""),
                "accessLevel", questionSet.getAccessLevel().name(),
                "status", questionSet.getStatus().name(),
                "itemCount", questionSet.getItemCount(),
                "maxScore", questionSet.getMaxScore());
    }

    private static Byte toByte(Integer value) {
        return value == null ? null : value.byteValue();
    }

    private static Short toShort(Integer value) {
        return value == null ? null : value.shortValue();
    }
}
