package vn.weconex.aptis.classroom.service;

import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomMaterial;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPost.PostStatus;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction;
import vn.weconex.aptis.classroom.repository.ClassroomMaterialRepository;
import vn.weconex.aptis.classroom.repository.ClassroomPostRepository;
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
                ? postRepository.findByClassroomIdAndStatusOrderByCreatedAtDesc(
                        classroomId, PostStatus.PUBLISHED)
                : postRepository.findByClassroomIdOrderByCreatedAtDesc(classroomId);
    }

    @Transactional
    public ClassroomPost addPost(
            String classroomId, String createdBy, String title, String content) {

        ClassroomPost post = new ClassroomPost();
        post.setId(UUID.randomUUID().toString());
        post.setClassroomId(classroomId);
        post.setCreatedBy(createdBy);
        post.setTitle(title.trim());
        post.setContent(content == null ? "" : content);
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
    public List<ClassroomPrediction> predictions(String classroomId) {
        return predictionRepository.findByClassroomIdOrderByCreatedAtDesc(classroomId);
    }

    @Transactional
    public ClassroomPrediction addPrediction(
            String classroomId, String createdBy, String componentId,
            String title, String content) {

        ClassroomPrediction prediction = new ClassroomPrediction();
        prediction.setId(UUID.randomUUID().toString());
        prediction.setClassroomId(classroomId);
        prediction.setCreatedBy(createdBy);
        prediction.setComponentId(componentId == null || componentId.isBlank() ? null : componentId);
        prediction.setTitle(title.trim());
        prediction.setContent(content);
        return predictionRepository.save(prediction);
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
