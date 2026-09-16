package vn.weconex.aptis.classroom.web;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.auth.domain.UserProfile;
import vn.weconex.aptis.auth.repository.UserProfileRepository;
import vn.weconex.aptis.auth.repository.UserRepository;
import vn.weconex.aptis.classroom.domain.QuestionSetContribution;
import vn.weconex.aptis.classroom.domain.QuestionSetContribution.ContributionStatus;
import vn.weconex.aptis.classroom.repository.QuestionSetContributionRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.common.util.PageResponse;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;

/**
 * Admin duyệt đề giáo viên đề xuất vào ngân hàng chung.
 *
 * <p>Chấp nhận thì đề gỡ {@code ownerTeacherId} và trở thành đề hệ thống — mọi
 * học viên đều thấy. Từ chối thì đề vẫn nguyên trong lớp của giáo viên, kèm lý
 * do để họ sửa và gửi lại.
 */
@RestController
@RequestMapping("/api/v1/admin/question-set-contributions")
@RequiredArgsConstructor
@Slf4j
public class AdminContributionController {

    private final QuestionSetContributionRepository contributionRepository;
    private final QuestionSetRepository questionSetRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final CurrentUser currentUser;

    @GetMapping
    @PreAuthorize("hasAuthority('question_set:review')")
    @Transactional(readOnly = true)
    public PageResponse<ClassroomDtos.ContributionResponse> list(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<QuestionSetContribution> rows = status == null || status.isBlank()
                ? contributionRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                : contributionRepository.findByStatusOrderByCreatedAtAsc(
                        parseStatus(status), PageRequest.of(page, size));

        Map<String, ClassroomDtos.ContributionResponse> dtos = toDtos(rows.getContent()).stream()
                .collect(Collectors.toMap(
                        ClassroomDtos.ContributionResponse::id, Function.identity()));

        return PageResponse.of(rows, row -> dtos.get(row.getId()));
    }

    /** Nhận đề vào ngân hàng chung: gỡ chủ sở hữu, đề thành của hệ thống. */
    @PostMapping("/{id}/accept")
    @PreAuthorize("hasAuthority('question_set:publish')")
    @Transactional
    public ClassroomDtos.ContributionResponse accept(
            @PathVariable String id,
            @Valid @RequestBody ClassroomDtos.ReviewContributionRequest request) {

        QuestionSetContribution contribution = requirePending(id);
        QuestionSet questionSet = questionSetRepository
                .findById(contribution.getQuestionSetId())
                .orElseThrow(() -> ApiException.notFound(
                        "QuestionSet", contribution.getQuestionSetId()));

        // Gỡ chủ sở hữu là đề rời khỏi lớp riêng và vào kho chung. Giáo viên
        // mất quyền sửa nó — đề đã thành tài sản chung, sửa phải qua admin.
        questionSet.setOwnerTeacherId(null);
        questionSetRepository.save(questionSet);

        contribution.setStatus(ContributionStatus.ACCEPTED);
        contribution.setAdminNote(blankToNull(request.adminNote()));
        contribution.setReviewedBy(currentUser.requireUserId());
        contribution.setReviewedAt(Instant.now());

        log.info("Nhận đề {} của giáo viên {} vào ngân hàng chung",
                questionSet.getCode(), contribution.getTeacherUserId());

        return toDtos(List.of(contributionRepository.save(contribution))).get(0);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('question_set:review')")
    @Transactional
    public ClassroomDtos.ContributionResponse reject(
            @PathVariable String id,
            @Valid @RequestBody ClassroomDtos.ReviewContributionRequest request) {

        QuestionSetContribution contribution = requirePending(id);
        contribution.setStatus(ContributionStatus.REJECTED);
        contribution.setAdminNote(blankToNull(request.adminNote()));
        contribution.setReviewedBy(currentUser.requireUserId());
        contribution.setReviewedAt(Instant.now());

        return toDtos(List.of(contributionRepository.save(contribution))).get(0);
    }

    private QuestionSetContribution requirePending(String id) {
        QuestionSetContribution contribution = contributionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("QuestionSetContribution", id));

        if (contribution.getStatus() != ContributionStatus.PENDING) {
            throw new ApiException(ErrorCode.CONFLICT, "Đề xuất này đã được xử lý");
        }
        return contribution;
    }

    /** Dựng danh sách kèm tên đề và tên giáo viên, gom theo lô để tránh N+1. */
    private List<ClassroomDtos.ContributionResponse> toDtos(
            List<QuestionSetContribution> rows) {

        if (rows.isEmpty()) {
            return List.of();
        }

        Map<String, QuestionSet> sets = questionSetRepository
                .findAllById(rows.stream()
                        .map(QuestionSetContribution::getQuestionSetId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(QuestionSet::getId, Function.identity()));

        List<String> teacherIds = rows.stream()
                .map(QuestionSetContribution::getTeacherUserId).distinct().toList();
        Map<String, String> emails = userRepository.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getEmail()));
        Map<String, String> names = profileRepository.findByUserIdIn(teacherIds).stream()
                .filter(p -> p.getFullName() != null && !p.getFullName().isBlank())
                .collect(Collectors.toMap(UserProfile::getUserId, UserProfile::getFullName));

        return rows.stream().map(row -> {
            QuestionSet set = sets.get(row.getQuestionSetId());
            return new ClassroomDtos.ContributionResponse(
                    row.getId(),
                    row.getQuestionSetId(),
                    set == null ? "" : set.getTitle(),
                    set == null ? "" : set.getCode(),
                    set == null || set.getPart() == null ? "" : set.getPart().getName(),
                    set == null || set.getPart() == null || set.getPart().getComponent() == null
                            ? "" : set.getPart().getComponent().getName(),
                    row.getTeacherUserId(),
                    names.getOrDefault(row.getTeacherUserId(), ""),
                    emails.getOrDefault(row.getTeacherUserId(), ""),
                    row.getStatus().name(),
                    row.getNote(),
                    row.getAdminNote(),
                    row.getReviewedAt(),
                    row.getCreatedAt());
        }).toList();
    }

    private static ContributionStatus parseStatus(String raw) {
        try {
            return ContributionStatus.valueOf(raw.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Trạng thái không hợp lệ");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
