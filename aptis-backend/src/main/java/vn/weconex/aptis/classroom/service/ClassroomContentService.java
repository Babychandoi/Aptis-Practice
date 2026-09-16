package vn.weconex.aptis.classroom.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomMaterial;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost.PostStatus;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction.PredictionStatus;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction.Priority;
import vn.weconex.aptis.classroom.domain.ClassroomPredictionQuestionSet;
import vn.weconex.aptis.classroom.repository.ClassroomMaterialRepository;
import vn.weconex.aptis.classroom.repository.ClassroomPostRepository;
import vn.weconex.aptis.classroom.repository.ClassroomPredictionQuestionSetRepository;
import vn.weconex.aptis.classroom.repository.ClassroomPredictionRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Nội dung riêng của lớp: tài liệu, bảng tin, dự đoán đề.
 *
 * <p>Ba thứ này chỉ học viên trong lớp thấy — khác với bảng tin và dự đoán
 * chung của hệ thống.
 *
 * <p>Mọi hàm nhận {@code classroomId} đã được phía gọi xác nhận quyền sở hữu
 * qua {@link ClassroomService#requireOwnedClassroom}.
 */
@Service
@RequiredArgsConstructor
public class ClassroomContentService {

    private final ClassroomMaterialRepository materialRepository;
    private final ClassroomPredictionQuestionSetRepository predictionQuestionSetRepository;
    private final ClassroomPostRepository postRepository;
    private final ClassroomPredictionRepository predictionRepository;

    // ---------------- Tài liệu ----------------

    @Transactional(readOnly = true)
    public List<ClassroomMaterial> materials(String classroomId) {
        return materialRepository.findByClassroomIdOrderByCreatedAtDesc(classroomId);
    }

    @Transactional
    public ClassroomMaterial addMaterial(
            String classroomId, String createdBy, String title,
            ClassroomMaterial.MaterialType type, String assetId, String linkUrl) {

        if (type == ClassroomMaterial.MaterialType.LINK && (linkUrl == null || linkUrl.isBlank())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Thiếu đường dẫn tài liệu");
        }
        if (type == ClassroomMaterial.MaterialType.FILE && (assetId == null || assetId.isBlank())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Chưa tải tệp lên");
        }

        ClassroomMaterial material = new ClassroomMaterial();
        material.setId(UUID.randomUUID().toString());
        material.setClassroomId(classroomId);
        material.setCreatedBy(createdBy);
        material.setTitle(title.trim());
        material.setMaterialType(type);
        material.setAssetId(assetId);
        material.setLinkUrl(linkUrl);
        return materialRepository.save(material);
    }

    @Transactional
    public void deleteMaterial(String classroomId, String materialId) {
        ClassroomMaterial material = materialRepository.findById(materialId)
                .orElseThrow(() -> ApiException.notFound("ClassroomMaterial", materialId));

        requireSameClassroom(material.getClassroomId(), classroomId);
        materialRepository.delete(material);
    }

    // ---------------- Bảng tin lớp ----------------

    @Transactional(readOnly = true)
    public List<ClassroomPost> posts(String classroomId, boolean publishedOnly) {
        return publishedOnly
                ? postRepository.findByClassroomIdAndStatusOrderByPinnedDescPublishedAtDesc(
                        classroomId, PostStatus.PUBLISHED)
                : postRepository.findByClassroomIdOrderByPinnedDescCreatedAtDesc(classroomId);
    }

    /** Một bài trong bảng tin lớp, để giáo viên sửa lại. */
    @Transactional(readOnly = true)
    public ClassroomPost post(String classroomId, String postId) {
        ClassroomPost post = postRepository.findById(postId)
                .orElseThrow(() -> ApiException.notFound("ClassroomPost", postId));
        requireSameClassroom(post.getClassroomId(), classroomId);
        return post;
    }

    /**
     * Nội dung một bài đăng, gom lại để khỏi truyền chuỗi tham số dài.
     *
     * @param status null = giữ nguyên trạng thái hiện tại khi sửa
     */
    public record PostContent(
            String title,
            String excerpt,
            String content,
            String coverAssetId,
            Boolean pinned,
            PostStatus status) {
    }

    @Transactional
    public ClassroomPost savePost(
            String classroomId, String createdBy, String postId, PostContent input) {

        ClassroomPost post;
        if (postId == null) {
            post = new ClassroomPost();
            post.setId(UUID.randomUUID().toString());
            post.setClassroomId(classroomId);
            post.setCreatedBy(createdBy);
        } else {
            post = postRepository.findById(postId)
                    .orElseThrow(() -> ApiException.notFound("ClassroomPost", postId));
            requireSameClassroom(post.getClassroomId(), classroomId);
        }

        post.setTitle(input.title().trim());
        post.setExcerpt(blankToNull(input.excerpt()));
        post.setContent(input.content() == null ? "" : input.content());
        post.setCoverAssetId(blankToNull(input.coverAssetId()));
        if (input.pinned() != null) {
            post.setPinned(input.pinned());
        }

        if (input.status() != null) {
            PostStatus truoc = post.getStatus();
            post.setStatus(input.status());

            // Ghi mốc đăng lần đầu. Đăng lại một bài từng gỡ xuống thì giữ mốc
            // cũ, nếu không bài cũ nhảy lên đầu bảng tin như bài mới.
            if (input.status() == PostStatus.PUBLISHED && post.getPublishedAt() == null) {
                post.setPublishedAt(Instant.now());
            }
            // Hạ về nháp thì bỏ mốc: bài chưa từng đến tay học viên.
            if (input.status() == PostStatus.DRAFT && truoc == PostStatus.DRAFT) {
                post.setPublishedAt(null);
            }
        }

        return postRepository.save(post);
    }

    @Transactional
    public void deletePost(String classroomId, String postId) {
        ClassroomPost post = postRepository.findById(postId)
                .orElseThrow(() -> ApiException.notFound("ClassroomPost", postId));

        requireSameClassroom(post.getClassroomId(), classroomId);
        postRepository.delete(post);
    }

    // ---------------- Dự đoán riêng ----------------

    @Transactional(readOnly = true)
    public List<ClassroomPrediction> predictions(String classroomId, boolean publishedOnly) {
        return publishedOnly
                ? predictionRepository
                        .findByClassroomIdAndStatusOrderByPredictDateDescDisplayOrderAsc(
                                classroomId, PredictionStatus.PUBLISHED)
                : predictionRepository
                        .findByClassroomIdOrderByPredictDateDescDisplayOrderAsc(classroomId);
    }

    @Transactional(readOnly = true)
    public ClassroomPrediction prediction(String classroomId, String predictionId) {
        ClassroomPrediction prediction = predictionRepository.findById(predictionId)
                .orElseThrow(() -> ApiException.notFound("ClassroomPrediction", predictionId));
        requireSameClassroom(prediction.getClassroomId(), classroomId);
        return prediction;
    }

    /** Đề gắn đích danh vào từng mục dự đoán, nạp một lượt cho cả danh sách. */
    @Transactional(readOnly = true)
    public Map<String, List<String>> questionSetIdsOf(List<String> predictionIds) {
        if (predictionIds.isEmpty()) {
            return Map.of();
        }
        return predictionQuestionSetRepository
                .findByPredictionIdInOrderByDisplayOrderAsc(predictionIds).stream()
                .collect(Collectors.groupingBy(
                        ClassroomPredictionQuestionSet::getPredictionId,
                        Collectors.mapping(
                                ClassroomPredictionQuestionSet::getQuestionSetId,
                                Collectors.toList())));
    }

    /**
     * Nội dung một mục dự đoán.
     *
     * @param topicId chủ đề hệ thống; có thì học viên bấm vào mở được đề
     * @param questionSetIds đề chỉ đích danh; null = giữ nguyên danh sách cũ
     */
    public record PredictionContent(
            String componentId,
            String topicId,
            String partId,
            LocalDate predictDate,
            Priority priority,
            String label,
            String sectionLabel,
            String source,
            PredictionStatus status,
            Integer displayOrder,
            String title,
            String content,
            List<String> questionSetIds) {
    }

    @Transactional
    public ClassroomPrediction savePrediction(
            String classroomId, String createdBy, String predictionId, PredictionContent input) {

        ClassroomPrediction prediction;
        if (predictionId == null) {
            prediction = new ClassroomPrediction();
            prediction.setId(UUID.randomUUID().toString());
            prediction.setClassroomId(classroomId);
            prediction.setCreatedBy(createdBy);
        } else {
            prediction = predictionRepository.findById(predictionId)
                    .orElseThrow(() -> ApiException.notFound("ClassroomPrediction", predictionId));
            requireSameClassroom(prediction.getClassroomId(), classroomId);
        }

        prediction.setComponentId(blankToNull(input.componentId()));
        prediction.setTopicId(blankToNull(input.topicId()));
        prediction.setPartId(blankToNull(input.partId()));
        prediction.setPredictDate(input.predictDate());
        prediction.setLabel(blankToNull(input.label()));
        prediction.setSectionLabel(blankToNull(input.sectionLabel()));
        prediction.setSource(blankToNull(input.source()));
        prediction.setTitle(input.title().trim());
        prediction.setContent(input.content());
        if (input.priority() != null) {
            prediction.setPriority(input.priority());
        }
        if (input.status() != null) {
            prediction.setStatus(input.status());
        }
        if (input.displayOrder() != null) {
            prediction.setDisplayOrder(input.displayOrder());
        }

        ClassroomPrediction saved = predictionRepository.save(prediction);
        if (input.questionSetIds() != null) {
            replaceQuestionSets(saved.getId(), input.questionSetIds());
        }
        return saved;
    }

    /**
     * Thay toàn bộ danh sách đề của một mục dự đoán.
     *
     * <p>Xoá rồi ghi lại thay vì so sánh từng dòng: danh sách chỉ vài đề, và
     * cách này giữ đúng thứ tự giáo viên sắp mà không cần lần theo từng thay đổi.
     */
    private void replaceQuestionSets(String predictionId, List<String> questionSetIds) {
        predictionQuestionSetRepository.deleteByPredictionId(predictionId);
        if (questionSetIds.isEmpty()) {
            return;
        }

        // flush trước khi ghi lại: xoá và thêm cùng khoá chính trong một
        // transaction, không đẩy lệnh xoá xuống trước thì dính trùng khoá.
        predictionQuestionSetRepository.flush();

        List<ClassroomPredictionQuestionSet> rows = new ArrayList<>();
        for (int i = 0; i < questionSetIds.size(); i++) {
            ClassroomPredictionQuestionSet row = new ClassroomPredictionQuestionSet();
            row.setPredictionId(predictionId);
            row.setQuestionSetId(questionSetIds.get(i));
            row.setDisplayOrder(i);
            rows.add(row);
        }
        predictionQuestionSetRepository.saveAll(rows);
    }

    /** Ô để trống trên form về null, để không lưu chuỗi rỗng lẫn với "chưa nhập". */
    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional
    public void deletePrediction(String classroomId, String predictionId) {
        ClassroomPrediction prediction = predictionRepository.findById(predictionId)
                .orElseThrow(() -> ApiException.notFound("ClassroomPrediction", predictionId));

        requireSameClassroom(prediction.getClassroomId(), classroomId);
        predictionRepository.delete(prediction);
    }

    /**
     * Nội dung phải thuộc đúng lớp đang thao tác.
     *
     * <p>Không có bước này thì giáo viên đoán được id là xoá được nội dung của
     * lớp người khác.
     */
    private static void requireSameClassroom(String ownerClassroomId, String classroomId) {
        if (!ownerClassroomId.equals(classroomId)) {
            throw ApiException.forbidden("Nội dung không thuộc lớp này");
        }
    }
}
