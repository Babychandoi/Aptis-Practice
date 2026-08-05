import clsx from 'clsx';
import type { EvaluationResult } from '@/types/api';
import { formatPercent } from '@/lib/format';

/**
 * Kết quả chấm Speaking/Writing theo rubric.
 *
 * <p>Hiển thị rõ đây là chấm tự động: học viên cần biết điểm này không thay thế
 * nhận xét của giáo viên.
 */
export function EvaluationFeedbackCard({ result }: { result: EvaluationResult }) {
  const percentage = result.maxScore > 0 ? (result.totalScore / result.maxScore) * 100 : 0;

  return (
    <div className="card space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="font-semibold">Nhận xét chi tiết</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {result.evaluatorType === 'AI' ? 'Chấm tự động' : 'Giáo viên chấm'}
            {result.model ? ` · ${result.model}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-600">
            {result.totalScore.toFixed(1)}
            <span className="text-base font-normal text-slate-500">
              /{result.maxScore.toFixed(0)}
            </span>
          </p>
          {result.cefrLevel && (
            <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {result.cefrLevel}
            </span>
          )}
        </div>
      </div>

      {/* Điểm từng tiêu chí */}
      <div className="space-y-2.5">
        {result.criteria.map((criterion) => {
          const ratio = criterion.maxScore > 0 ? criterion.score / criterion.maxScore : 0;

          return (
            <div key={criterion.code}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{criterion.name}</span>
                <span className="tabular-nums text-slate-600">
                  {criterion.score.toFixed(1)}/{criterion.maxScore.toFixed(0)}
                </span>
              </div>

              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={clsx(
                    'h-full transition-all',
                    ratio >= 0.8
                      ? 'bg-emerald-500'
                      : ratio >= 0.5
                        ? 'bg-amber-500'
                        : 'bg-red-500',
                  )}
                  style={{ width: `${Math.max(2, ratio * 100)}%` }}
                />
              </div>

              {criterion.feedback && (
                <p className="mt-1 text-xs text-slate-600">{criterion.feedback}</p>
              )}
            </div>
          );
        })}
      </div>

      {result.feedback.summary && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-sm text-slate-700">{result.feedback.summary}</p>
          <p className="mt-1 text-xs text-slate-500">
            Đạt {formatPercent(percentage)} điểm tối đa
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FeedbackList
          title="Điểm mạnh"
          items={result.feedback.strengths}
          tone="positive"
        />
        <FeedbackList
          title="Cần cải thiện"
          items={result.feedback.weaknesses}
          tone="negative"
        />
      </div>

      {result.feedback.suggestions.length > 0 && (
        <FeedbackList
          title="Gợi ý cải thiện"
          items={result.feedback.suggestions}
          tone="neutral"
        />
      )}

      {result.transcript && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
            Nội dung đã nói (transcript)
          </p>
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {result.transcript}
          </p>
        </div>
      )}

      {result.feedback.correctedVersion && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
            Bản sửa tham khảo
          </p>
          <p className="question-content rounded-lg bg-emerald-50 p-3 text-sm">
            {result.feedback.correctedVersion}
          </p>
        </div>
      )}
    </div>
  );
}

function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'positive' | 'negative' | 'neutral';
}) {
  if (items.length === 0) {
    return null;
  }

  const marker = tone === 'positive' ? '✓' : tone === 'negative' ? '!' : '→';

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-slate-500">{title}</p>
      <ul className="space-y-1 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span
              className={clsx(
                'mt-0.5 shrink-0 font-semibold',
                tone === 'positive' && 'text-emerald-600',
                tone === 'negative' && 'text-amber-600',
                tone === 'neutral' && 'text-brand-600',
              )}
            >
              {marker}
            </span>
            <span className="text-slate-700">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
