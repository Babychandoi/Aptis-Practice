package vn.weconex.aptis.classroom.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.classroom.domain.QuestionSetContribution;
import vn.weconex.aptis.classroom.repository.QuestionSetContributionRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.util.Enums.ContentStatus;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.content.service.AdminContentService;
import vn.weconex.aptis.content.web.AdminContentDtos;

/**
 * Giáo viên tự soạn đề cho lớp mình.
 *
 * <p>Dùng lại {@link AdminContentService} để soạn nội dung — cùng 12 dạng bài,
 * cùng cách lưu Mongo, cùng bộ kiểm tra. Viết một trình soạn riêng cho giáo
 * viên sẽ thành bản rút gọn thiếu dạng này dạng kia, rồi phải sửa hai nơi mỗi
 * lần thay đổi.
 *
 * <p>Ba điểm khác admin:
 *
 * <ol>
 *   <li>Đề gắn {@code ownerTeacherId} nên chỉ lớp của giáo viên đó thấy.
 *   <li>Không qua luồng duyệt: soạn xong là PUBLISHED, dùng được ngay. Đề chỉ
 *       nằm trong lớp họ nên không cần ai gác cổng.
 *   <li>Sửa được cả khi đã PUBLISHED. Admin phải hạ SUSPENDED trước vì đề của
 *       họ đang phục vụ hàng nghìn học viên; đề của một lớp thì không.
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherContentAuthoringService {

    private final AdminContentService adminContentService;
    private final QuestionSetRepository questionSetRepository;
    private final QuestionSetContributionRepository contributionRepository;

    @Transactional
    public QuestionSet create(
            String teacherUserId, AdminContentDtos.CreateQuestionSetRequest request) {

        QuestionSet created = adminContentService.create(teacherUserId, request);

        // Gắn chủ sở hữu và cho dùng ngay. Phải làm sau khi service chung tạo
        // xong vì nó luôn đặt DRAFT cho quy trình duyệt của admin.
        created.setOwnerTeacherId(teacherUserId);
        created.setStatus(ContentStatus.PUBLISHED);
        created.setPublishedAt(java.time.Instant.now());

        log.info("Giáo viên {} soạn đề {} cho lớp mình", teacherUserId, created.getCode());
        return questionSetRepository.save(created);
    }

    @Transactional
    public QuestionSet update(
            String teacherUserId,
            String questionSetId,
            AdminContentDtos.UpdateQuestionSetRequest request) {

        QuestionSet existing = requireOwned(teacherUserId, questionSetId);

        // Hạ về DRAFT để qua được kiểm tra trạng thái của service chung, rồi
        // trả lại PUBLISHED. Giáo viên sửa đề của lớp mình không cần bước
        // "tạm ngưng rồi mới sửa" như đề của ngân hàng chung.
        ContentStatus truoc = existing.getStatus();
        existing.setStatus(ContentStatus.DRAFT);
        questionSetRepository.saveAndFlush(existing);

        QuestionSet updated = adminContentService.update(teacherUserId, questionSetId, request);
        updated.setStatus(truoc == ContentStatus.ARCHIVED ? ContentStatus.DRAFT : truoc);
        return questionSetRepository.save(updated);
    }

    @Transactional(readOnly = true)
    public QuestionSet requireOwned(String teacherUserId, String questionSetId) {
        QuestionSet questionSet = questionSetRepository.findById(questionSetId)
                .orElseThrow(() -> ApiException.notFound("QuestionSet", questionSetId));

        if (!teacherUserId.equals(questionSet.getOwnerTeacherId())) {
            // Cùng một thông báo cho "đề người khác" và "đề hệ thống": nói rõ
            // đề nào thuộc về ai là để lộ thông tin không cần thiết.
            throw ApiException.forbidden("Đề này không thuộc về bạn");
        }
        return questionSet;
    }

    @Transactional
    public void delete(String teacherUserId, String questionSetId) {
        QuestionSet questionSet = requireOwned(teacherUserId, questionSetId);
        questionSetRepository.delete(questionSet);
        log.info("Giáo viên {} xoá đề {}", teacherUserId, questionSet.getCode());
    }

    // ------------------------------------------------- Đề xuất vào kho chung

    /**
     * Gửi đề của mình cho admin xem xét đưa vào ngân hàng đề chung.
     *
     * <p>Gửi lại một đề từng bị từ chối thì cập nhật chính dòng cũ — admin thấy
     * được nó đã qua mấy vòng thay vì một loạt dòng trùng.
     */
    @Transactional
    public QuestionSetContribution contribute(
            String teacherUserId, String questionSetId, String note) {

        requireOwned(teacherUserId, questionSetId);

        QuestionSetContribution contribution = contributionRepository
                .findByQuestionSetId(questionSetId)
                .orElseGet(() -> {
                    QuestionSetContribution created = new QuestionSetContribution();
                    created.setId(UUID.randomUUID().toString());
                    created.setQuestionSetId(questionSetId);
                    created.setTeacherUserId(teacherUserId);
                    return created;
                });

        if (contribution.getStatus() == QuestionSetContribution.ContributionStatus.PENDING
                && contribution.getCreatedAt() != null) {
            throw new ApiException(
                    ErrorCode.CONFLICT, "Đề này đang chờ quản trị viên duyệt");
        }
        if (contribution.getStatus() == QuestionSetContribution.ContributionStatus.ACCEPTED) {
            throw new ApiException(
                    ErrorCode.CONFLICT, "Đề này đã được đưa vào ngân hàng chung");
        }

        contribution.setStatus(QuestionSetContribution.ContributionStatus.PENDING);
        contribution.setNote(note == null || note.isBlank() ? null : note.strip());
        contribution.setAdminNote(null);
        contribution.setReviewedBy(null);
        contribution.setReviewedAt(null);

        return contributionRepository.save(contribution);
    }

    @Transactional(readOnly = true)
    public List<QuestionSet> myQuestionSets(String teacherUserId) {
        return questionSetRepository.findByOwnerTeacherIdOrderByCreatedAtDesc(teacherUserId);
    }

    @Transactional(readOnly = true)
    public Map<String, QuestionSetContribution> contributionsOf(List<String> questionSetIds) {
        if (questionSetIds.isEmpty()) {
            return Map.of();
        }
        return contributionRepository.findByQuestionSetIdIn(questionSetIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                        QuestionSetContribution::getQuestionSetId, c -> c));
    }
}
