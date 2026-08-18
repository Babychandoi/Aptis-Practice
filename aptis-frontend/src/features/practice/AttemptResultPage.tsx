import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { practiceApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { EvaluationFeedbackCard } from '@/features/practice/EvaluationFeedbackCard';
import { formatDuration, formatPercent } from '@/lib/format';
import { formatScoreLine } from './scoreDisplay';

export function AttemptResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const attemptQuery = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => practiceApi.getAttempt(attemptId!),
    enabled: Boolean(attemptId),
    // Speaking/Writing chấm bất đồng bộ — poll tới khi có kết quả
    refetchInterval: (query) => (query.state.data?.status === 'SCORING' ? 5000 : false),
  });

  // Trong lúc SCORING chỉ poll trạng thái attempt. Khi hoàn tất mới lấy feedback,
  // tránh hai vòng polling cùng lúc cho mỗi học viên.
  const evaluationsQuery = useQuery({
    queryKey: ['attempt-evaluations', attemptId],
    queryFn: () => practiceApi.evaluations(attemptId!),
    enabled: Boolean(attemptId) && attemptQuery.data?.status === 'COMPLETED',
  });

  if (attemptQuery.isLoading) {
    return <LoadingBlock label="Đang tải kết quả…" />;
  }

  if (attemptQuery.error || !attemptQuery.data) {
    return (
      <ErrorBlock
        message="Không tải được kết quả"
        onRetry={() => void attemptQuery.refetch()}
      />
    );
  }

  const attempt = attemptQuery.data;
  const scoring = attempt.status === 'SCORING';

  const totalAwarded = attempt.questionSets.reduce(
    (sum, set) => sum + (set.awardedScore ?? 0),
    0,
  );
  const totalMax = attempt.questionSets.reduce((sum, set) => sum + (set.maxScore ?? 0), 0);
  const displayedAwarded = attempt.rawScore ?? totalAwarded;
  const displayedMax = attempt.maxScore ?? totalMax;
  const percentage = attempt.percentageScore
    ?? (displayedMax > 0 ? (displayedAwarded / displayedMax) * 100 : null);

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate('/history')}
        className="text-sm text-brand-600 hover:underline"
      >
        ← Lịch sử làm bài
      </button>

      <section className="card text-center">
        <h1 className="text-lg font-semibold">Kết quả</h1>

        {scoring ? (
          <div className="mt-3">
            <p className="text-sm text-slate-600">
              Phần Speaking/Writing đang được chấm. Trang sẽ tự cập nhật.
            </p>
            <p className="mt-2 text-xs text-slate-500">Đang chấm…</p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-4xl font-bold text-brand-600">
              {formatPercent(percentage)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {displayedAwarded.toFixed(1)}/{displayedMax.toFixed(1)} điểm luyện tập
            </p>
          </>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm">
          <div>
            <p className="text-slate-500">Số câu</p>
            <p className="font-semibold">{attempt.totalItems}</p>
          </div>
          <div>
            <p className="text-slate-500">Đã trả lời</p>
            <p className="font-semibold">{attempt.answeredItems}</p>
          </div>
          <div>
            <p className="text-slate-500">Thời gian</p>
            <p className="font-semibold">{formatDuration(attempt.timeSpentSeconds)}</p>
          </div>
        </div>
      </section>

      {(evaluationsQuery.data?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Nhận xét Speaking / Writing</h2>
          {evaluationsQuery.data!.map((result) => (
            <EvaluationFeedbackCard key={result.questionSetId} result={result} />
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Chi tiết từng bộ câu hỏi</h2>
        <div className="space-y-2">
          {attempt.questionSets.map((set) => {
            const ratio = set.maxScore > 0 ? (set.awardedScore ?? 0) / set.maxScore : 0;
            const scoreLine = formatScoreLine(set.awardedScore, set.maxScore);

            return (
              <div
                key={set.attemptQuestionSetId}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {set.content.title ?? `Bộ ${set.displayOrder}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {set.content.items.length} câu · {set.content.taskTypeCode}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  {scoreLine === null ? (
                    <span className="text-xs text-slate-500">Đang chấm</span>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">
                        {scoreLine}
                      </p>
                      <p className="text-xs text-slate-500">{formatPercent(ratio * 100)}</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex gap-3">
        <Link to={`/attempts/${attempt.id}`} className="btn-secondary flex-1 text-center">
          Xem lại bài làm và đáp án
        </Link>
        {attempt.partId && (
          <Link to={`/parts/${attempt.partId}`} className="btn-primary flex-1 text-center">
            Luyện tiếp Part này
          </Link>
        )}
      </div>
    </div>
  );
}
