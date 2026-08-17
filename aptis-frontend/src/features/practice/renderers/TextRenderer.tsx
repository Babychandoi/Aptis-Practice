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
        className="input" placeholder="Nhập câu trả lời" />
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
  const fieldClass = clsx('input font-normal', aboveMax && 'border-red-400 focus:border-red-500');

  return (
    <div>
      {(minWords !== null || registerLabel) && (
        <p className="mb-2 text-xs text-slate-500">
          {minWords !== null && maxWords !== null && `Yêu cầu ${minWords}–${maxWords} từ`}
          {registerLabel ? ` · Văn phong: ${registerLabel}` : ''}
        </p>
      )}
      {compact ? (
        <input type="text" value={draft.textValue ?? ''} disabled={disabled}
          onChange={(event) => onChange({ textValue: event.target.value })}
          className={fieldClass} placeholder="Nhập câu trả lời ngắn…" />
      ) : (
        <textarea rows={10} value={draft.textValue ?? ''} disabled={disabled}
          onChange={(event) => onChange({ textValue: event.target.value })}
          className={fieldClass} placeholder="Viết bài của bạn tại đây…" />
      )}
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className={clsx(belowMin && 'text-amber-600', aboveMax && 'text-red-600', !belowMin && !aboveMax && 'text-slate-500')}>
          {words} từ
          {belowMin && ` — còn thiếu ${minWords! - words} từ`}
          {aboveMax && ` — vượt ${words - maxWords!} từ`}
        </span>
        {showAnswer && item.rubricCode && <span className="text-slate-400">Chấm theo rubric Writing</span>}
      </div>
    </div>
  );
}

function numberConstraint(item: QuestionItem, key: string): number | null {
  const value = item.constraints[key];
  return typeof value === 'number' ? value : null;
}
