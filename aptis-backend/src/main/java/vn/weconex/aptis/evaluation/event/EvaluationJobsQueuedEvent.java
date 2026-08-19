package vn.weconex.aptis.evaluation.event;

import java.util.List;

/**
 * Đã tạo xong job chấm cho một lượt nộp bài.
 *
 * <p>Phát ra để chấm ngay thay vì chờ scheduler. Trước đây học viên nộp bài rồi
 * chờ lượt quét kế tiếp ({@code fixedDelay = 10s}), nên nửa thời gian chờ là chờ
 * vô ích: đo thật là 7–15 giây từ lúc bấm nộp tới lúc có điểm, trong đó chỉ 3–4
 * giây là AI chấm thật.
 *
 * <p>Scheduler vẫn giữ nguyên làm lưới an toàn cho job bị sót, job retry, và job
 * của instance khác trong cluster.
 *
 * @param jobIds job cần chấm ngay
 */
public record EvaluationJobsQueuedEvent(List<String> jobIds) {

    public EvaluationJobsQueuedEvent {
        jobIds = List.copyOf(jobIds);
    }
}
