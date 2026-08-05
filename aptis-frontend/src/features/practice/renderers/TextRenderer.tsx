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
      <input
        type="text"
        value={draft.textValue ?? ''}
        disabled={disabled}
        onChange={(e) => onChange({ textValue: e.target.value })}
        className="input"
        placeholder="Nhập câu trả lời"
      />

      {showAnswer && accepted.length > 0 && (
        <p className="mt-1.5 text-xs text-emerald-700">
          Đáp án chấp nhận: {accepted.join(' / ')}
        </p>
      )}
    </div>
  );
}

/**
 * Writing. Đếm từ theo minWords/maxWords trong constraints để học viên biết
 * đã đủ chưa — backend cũng kiểm tra lại khi nộp.
 */
export function LongTextRenderer({ item, draft, disabled, showAnswer, onChange }: Props) {
  const minWords = numberConstraint(item, 'minWords');
  const maxWords = numberConstraint(item, 'maxWords');
  const registerValue = item.constraints['register'];
  const register = typeof registerValue === 'string' ? registerValue : null;

  const words = wordCount(draft.textValue);
  const belowMin = minWords !== null && words > 0 && words < minWords;
  const aboveMax = maxWords !== null && words > maxWords;

  return (
    <div>
      {(minWords !== null || register) && (
        <p className="mb-2 text-xs text-slate-500">
          {minWords !== null && maxWords !== null && `Yêu cầu ${minWords}–${maxWords} từ`}
          {register ? ` · Văn phong: ${register}` : ''}
        </p>
      )}

      <textarea
        rows={10}
        value={draft.textValue ?? ''}
        disabled={disabled}
        onChange={(e) => onChange({ textValue: e.target.value })}
        className="input font-normal"
        placeholder="Viết bài của bạn tại đây…"
      />

      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span
          className={clsx(
            belowMin && 'text-amber-600',
            aboveMax && 'text-red-600',
            !belowMin && !aboveMax && 'text-slate-500',
          )}
        >
          {words} từ
          {belowMin && ` — còn thiếu ${minWords! - words} từ`}
          {aboveMax && ` — vượt ${words - maxWords!} từ`}
        </span>

        {showAnswer && item.rubricCode && (
          <span className="text-slate-400">Chấm theo {item.rubricCode}</span>
        )}
      </div>
    </div>
  );
}

function numberConstraint(item: QuestionItem, key: string): number | null {
  const value = item.constraints[key];
  return typeof value === 'number' ? value : null;
}
