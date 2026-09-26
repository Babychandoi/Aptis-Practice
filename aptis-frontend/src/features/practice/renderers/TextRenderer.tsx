import clsx from 'clsx';
import type { QuestionItem } from '@/types/api';
import { wordCount, type ResponseDraft } from '@/features/practice/responseState';

interface Props {
  item: QuestionItem;
  draft: ResponseDraft;
  disabled: boolean;
  showAnswer: boolean;
  onChange: (draft: ResponseDraft) => void;
}

export function ShortTextRenderer({ item, draft, disabled, showAnswer, onChange }: Props) {
  const accepted = item.answerKey?.acceptedValues ?? [];
  return (
    <div>
      <input type="text" value={draft.textValue ?? ''} disabled={disabled}
        onChange={(event) => onChange({ textValue: event.target.value })}
        className="block min-h-11 w-full min-w-0 rounded-xl border border-brand-300 bg-white px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-ink focus:ring-2 focus:ring-ink/15 disabled:bg-brand-50" placeholder="Nhập câu trả lời" />
      {showAnswer && accepted.length > 0 && (
        <p className="mt-1.5 text-xs text-emerald-700">Đáp án chấp nhận: {accepted.join(' / ')}</p>
      )}
    </div>
  );
}

export function LongTextRenderer({ item, draft, disabled, showAnswer, onChange }: Props) {
  const minWords = numberConstraint(item, 'minWords');
  const maxWords = numberConstraint(item, 'maxWords');
  const registerValue = item.constraints['register'];
  const register = typeof registerValue === 'string' ? registerValue : null;
  const registerLabel = register === 'informal'
    ? 'thân mật'
    : register === 'formal' ? 'trang trọng' : register;
  const compact = maxWords !== null && maxWords <= 15;
  const words = wordCount(draft.textValue);
  const belowMin = minWords !== null && words > 0 && words < minWords;
  const aboveMax = maxWords !== null && words > maxWords;
  const fieldClass = clsx(
    'block w-full min-w-0 rounded-2xl border bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:ring-2 disabled:bg-brand-50',
    aboveMax ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-brand-300 focus:border-ink focus:ring-ink/15',
  );
  // Thanh đếm từ: đầy theo giới hạn trên (hoặc dưới nếu không có trên).
  const limit = maxWords ?? minWords;
  const fillRatio = limit ? Math.min(1, words / limit) : 0;

  return (
    <div>
      {(minWords !== null || registerLabel) && (
        <p className="mb-2 text-xs text-ink-mute">
          {minWords !== null && maxWords !== null && `Yêu cầu ${minWords}–${maxWords} từ`}
          {registerLabel ? ` · Văn phong: ${registerLabel}` : ''}
        </p>
      )}
      {compact ? (
        <input type="text" value={draft.textValue ?? ''} disabled={disabled}
          onChange={(event) => onChange({ textValue: event.target.value })}
          className={fieldClass} placeholder="Nhập câu trả lời ngắn…" />
      ) : (
        <textarea rows={8} value={draft.textValue ?? ''} disabled={disabled}
          onChange={(event) => onChange({ textValue: event.target.value })}
          className={fieldClass} placeholder="Viết bài của bạn tại đây…" />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs">
        {limit !== null && (
          <span className="block h-1 w-24 overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
            <span
              className={clsx('block h-full rounded-full transition-all', aboveMax ? 'bg-red-500' : belowMin ? 'bg-amber-500' : 'bg-ink')}
              style={{ width: `${fillRatio * 100}%` }}
            />
          </span>
        )}
        <span className={clsx('font-medium tabular-nums', belowMin && 'text-amber-600', aboveMax && 'text-red-600', !belowMin && !aboveMax && 'text-ink-soft')}>
          {words}{maxWords !== null ? `/${maxWords}` : ''} từ
          {belowMin && ` — còn thiếu ${minWords! - words} từ`}
          {aboveMax && ` — vượt ${words - maxWords!} từ`}
        </span>
        {showAnswer && item.rubricCode && <span className="ml-auto text-ink-faint">Chấm theo rubric Writing</span>}
      </div>
    </div>
  );
}

function numberConstraint(item: QuestionItem, key: string): number | null {
  const value = item.constraints[key];
  return typeof value === 'number' ? value : null;
}
