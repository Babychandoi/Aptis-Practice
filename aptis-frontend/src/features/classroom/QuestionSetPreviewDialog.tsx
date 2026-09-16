import { useQuery } from '@tanstack/react-query';
import { teacherAuthoringApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { QuestionSetPreview } from '@/features/admin/QuestionSetDetailPage';
import { useEscapeKey } from '@/lib/useEscapeKey';

/**
 * Xem nội dung một đề trước khi chọn.
 *
 * <p>Không có cái này thì giáo viên chọn đề bằng mỗi cái tên, mà tên các đề
 * trong cùng một part gần như giống nhau ("Reading Part 1 - 111", "- 112"…).
 *
 * <p>Dùng lại đúng khung xem của admin nên hiển thị đủ mọi dạng bài, kèm audio
 * và ảnh, và hiện luôn đáp án — giáo viên cần thấy đáp án để biết đề có đúng ý
 * mình không.
 */
export function QuestionSetPreviewDialog({
  questionSetId,
  title,
  onClose,
}: {
  questionSetId: string;
  title: string;
  onClose: () => void;
}) {
  useEscapeKey(onClose);

  const query = useQuery({
    queryKey: ['teacher', 'question-set-preview', questionSetId],
    queryFn: () => teacherAuthoringApi.preview(questionSetId),
  });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-dark/45 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-3xl bg-white"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Xem trước nội dung đề — đáp án hiện sẵn để bạn kiểm tra.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-surface"
          >
            Đóng
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {query.isPending ? (
            <LoadingBlock label="Đang tải đề…" />
          ) : query.error ? (
            <ErrorBlock message="Không xem được đề này" onRetry={() => void query.refetch()} />
          ) : query.data.content ? (
            <QuestionSetPreview
              content={query.data.content}
              revision={query.data.revision}
              showAnswers={!query.data.answersHidden}
              hideHeader
            />
          ) : (
            <p className="card text-center text-sm text-slate-500">Đề này chưa có nội dung.</p>
          )}
        </div>
      </div>
    </div>
  );
}
