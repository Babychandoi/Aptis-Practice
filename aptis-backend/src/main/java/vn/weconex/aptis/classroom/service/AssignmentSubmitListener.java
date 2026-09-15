package vn.weconex.aptis.classroom.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.weconex.aptis.practice.service.AttemptService;

/**
 * Đánh dấu bài giao đã nộp khi học viên hoàn thành lượt làm bài.
 *
 * <p>Nghe event thay vì để AttemptService gọi thẳng: AssignmentService đã phụ
 * thuộc AttemptService để tạo lượt, gọi ngược lại sẽ thành vòng phụ thuộc.
 *
 * <p>Nuốt lỗi: lượt làm bài đã nộp xong rồi, hỏng ở bước ghi nhận bài giao thì
 * mất trạng thái chứ không được làm hỏng việc nộp bài của học viên.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AssignmentSubmitListener {

    private final AssignmentService assignmentService;

    @EventListener
    @Transactional
    public void onAttemptSubmitted(AttemptService.AttemptSubmittedEvent event) {
        try {
            assignmentService.markSubmitted(event.attemptId());
        } catch (RuntimeException ex) {
            log.warn("Không ghi nhận được bài nộp cho lượt {}: {}",
                    event.attemptId(), ex.getMessage());
        }
    }
}
