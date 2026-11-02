import type { QueryClient } from '@tanstack/react-query';
import type { Attempt, QuestionSetScore } from '@/types/api';

/**
 * Khoá cache của một lượt làm bài. studentUserId chỉ có khi giáo viên xem bài
 * của học viên. Dùng null thay cho undefined để khoá ghi ở trang khác (không có
 * studentUserId) khớp đúng khoá AttemptPage đọc.
 */
export const attemptQueryKey = (attemptId: string, studentUserId?: string) =>
  ['attempt', attemptId, studentUserId ?? null] as const;

/**
 * Lượt luyện theo Part chứa cả ngân hàng đề của Part (có Part 850 bộ, vài trăm
 * KB). Các API tạo/bắt đầu lượt đã trả đủ nội dung đó, nên ghi thẳng vào cache
 * để AttemptPage dùng luôn thay vì tải lại lần nữa.
 */
export function primeAttempt(queryClient: QueryClient, attempt: Attempt) {
  queryClient.setQueryData(attemptQueryKey(attempt.id), attempt);
}

/**
 * Chấm riêng một bộ: phản hồi đã có điểm và nội dung đã lộ đáp án của bộ đó,
 * nên chỉ vá bộ này trong cache thay vì tải lại cả lượt.
 */
export function applyQuestionSetScore(
  queryClient: QueryClient,
  attemptId: string,
  score: QuestionSetScore,
) {
  queryClient.setQueryData<Attempt>(attemptQueryKey(attemptId), (attempt) =>
    attempt && {
      ...attempt,
      questionSets: attempt.questionSets.map((set) =>
        set.questionSetId === score.questionSetId
          ? { ...set, status: 'SCORED' as const, awardedScore: score.awardedScore, content: score.content }
          : set,
      ),
    });
}
