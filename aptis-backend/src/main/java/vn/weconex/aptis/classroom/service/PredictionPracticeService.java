package vn.weconex.aptis.classroom.service;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.classroom.domain.ClassroomContentEntities.ClassroomPrediction;
import vn.weconex.aptis.classroom.repository.ClassroomPredictionQuestionSetRepository;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;
import vn.weconex.aptis.content.domain.QuestionSet;
import vn.weconex.aptis.content.repository.QuestionSetRepository;
import vn.weconex.aptis.practice.domain.TestAttempt;
import vn.weconex.aptis.practice.service.AttemptService;

/**
 * Mở lượt luyện từ một mục dự đoán của lớp.
 *
 * <p>Đề lấy từ hai nguồn, theo thứ tự ưu tiên:
 *
 * <ol>
 *   <li>Đề giáo viên chỉ đích danh — họ đã chọn tay thì đó đúng là thứ muốn lớp làm.
 *   <li>Đề cùng chủ đề, khi giáo viên chỉ gắn chủ đề mà không chọn đề cụ thể.
 * </ol>
 *
 * <p>Không kiểm tra Premium: nội dung của lớp mở theo tư cách thành viên lớp,
 * giống bài giao. Việc người gọi có ở trong lớp hay không do controller xác nhận.
 */
@Service
@RequiredArgsConstructor
public class PredictionPracticeService {

    /** Trần số đề một lượt, để mục dự đoán chủ đề rộng không tạo bài quá dài. */
    private static final int MAX_QUESTION_SETS = 12;

    private final ClassroomPredictionQuestionSetRepository predictionQuestionSetRepository;
    private final QuestionSetRepository questionSetRepository;
    private final AttemptService attemptService;

    @Transactional
    public TestAttempt start(String userId, ClassroomPrediction prediction) {
        List<QuestionSet> sets = resolveQuestionSets(prediction);

        if (sets.isEmpty()) {
            throw new ApiException(
                    ErrorCode.NOT_ENOUGH_QUESTION_SETS,
                    "Dự đoán này chưa có đề nào để luyện");
        }

        return attemptService.createAssignmentAttempt(userId, sets, false);
    }

    private List<QuestionSet> resolveQuestionSets(ClassroomPrediction prediction) {
        List<String> chiDinh = predictionQuestionSetRepository
                .findByPredictionIdOrderByDisplayOrderAsc(prediction.getId()).stream()
                .map(row -> row.getQuestionSetId())
                .toList();

        if (!chiDinh.isEmpty()) {
            return questionSetRepository.findAllById(chiDinh);
        }

        if (prediction.getTopicId() == null) {
            return List.of();
        }

        // Giới hạn phạm vi theo part nếu có, không thì theo kỹ năng. Thiếu bước
        // này thì một chủ đề trùng tên ở kỹ năng khác sẽ kéo ra đề sai hẳn.
        return questionSetRepository
                .findPublishedForPrediction(
                        prediction.getTopicId(),
                        prediction.getPartId(),
                        prediction.getComponentId())
                .stream()
                .limit(MAX_QUESTION_SETS)
                .toList();
    }
}
