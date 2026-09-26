import clsx from 'clsx';
import type { QuestionItem } from '@/types/api';
import type { ResponseDraft } from '@/features/practice/responseState';

interface Props {
  item: QuestionItem;
  draft: ResponseDraft;
  disabled: boolean;
  /** true sau khi nộp bài — tô màu đúng/sai theo answerKey */
  showAnswer: boolean;
  onChange: (draft: ResponseDraft) => void;
}

export function SingleChoiceRenderer({ item, draft, disabled, showAnswer, onChange }: Props) {
  const correctId = item.answerKey?.selectedOptionId;

  return (
    <div className={clsx(
      'grid gap-2',
      item.options.length === 3 && 'sm:grid-cols-3',
      item.options.length === 2 && 'sm:grid-cols-2',
      item.options.length === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
    )}>
      {item.options.map((option) => {
        const selected = draft.selectedOptionId === option.id;
        // Ba trạng thái phải nhìn ra khác nhau: chọn đúng, đáp án đúng mà bỏ
        // trống, và chọn sai. Trước đây đáp án đúng luôn tô xanh dù em có chọn
        // hay không, nên câu làm đúng và câu bỏ trống trông y hệt.
        const chonDung = showAnswer && selected && correctId === option.id;
        const dungNhungBoTrong = showAnswer && !selected && correctId === option.id;
        const isWrongPick = showAnswer && selected && correctId !== option.id;

        return (
          <label
            key={option.id}
            className={clsx(
              'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors',
              chonDung && 'border-2 border-emerald-500 bg-emerald-50',
              dungNhungBoTrong && 'border border-dashed border-emerald-400 bg-emerald-50/40',
              isWrongPick && 'border-2 border-red-400 bg-red-50',
              showAnswer && !selected && correctId !== option.id && 'border-slate-200',
              !showAnswer && selected && 'border-ink bg-brand-50',
              !showAnswer && !selected && 'border-brand-200 hover:bg-brand-50',
              disabled && 'cursor-default',
            )}
          >
            <input
              type="radio"
              name={item.id}
              value={option.id}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange({ selectedOptionId: option.id })}
              className="sr-only"
            />
            {option.code && (
              <span
                className={clsx(
                  'grid h-6 min-w-6 shrink-0 place-items-center rounded-md px-1 text-[11px] font-semibold',
                  chonDung && 'bg-emerald-600 text-white',
                  isWrongPick && 'bg-red-500 text-white',
                  dungNhungBoTrong && 'bg-emerald-100 text-emerald-800',
                  !showAnswer && selected && 'bg-brand-800 text-white',
                  !chonDung && !isWrongPick && !dungNhungBoTrong
                    && !(!showAnswer && selected) && 'bg-[#F1F5F9] text-[#334155]',
                )}
              >
                {option.code}
              </span>
            )}
            <span className="flex-1 text-xs leading-5 sm:text-[13px]">
              {option.content}
            </span>
            {/* Đánh dấu bằng hình chứ không chỉ bằng màu. */}
            {chonDung && (
              <span className="shrink-0 text-sm font-bold text-emerald-700" title="Chọn đúng">
                ✓
              </span>
            )}
            {isWrongPick && (
              <span className="shrink-0 text-sm font-bold text-red-600" title="Chọn sai">
                ✗
              </span>
            )}
            {dungNhungBoTrong && (
              <span className="shrink-0 text-[10px] font-semibold uppercase text-emerald-700">
                Đáp án
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

export function SingleChoiceSelectRenderer({ item, draft, disabled, showAnswer, onChange }: Props) {
  const correctId = item.answerKey?.selectedOptionId;
  const selectedId = draft.selectedOptionId ?? '';
  const selectedIsWrong = showAnswer && Boolean(selectedId) && selectedId !== correctId;
  // Bỏ trống không tô đỏ (không phải chọn sai) nhưng vẫn hiện đáp án: câu chưa
  // làm là câu học viên cần học nhất khi xem lại bài.
  const selectedIsBlank = showAnswer && !selectedId;
  const correctOption = item.options.find((option) => option.id === correctId);

  return (
    <div>
      <select
        value={selectedId}
        disabled={disabled}
        aria-label="Chọn đáp án"
        onChange={(event) => onChange({ selectedOptionId: event.target.value })}
        className={clsx(
          'min-h-12 w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition sm:text-[13px]',
          !showAnswer && 'border-[#E2E8F0] focus:border-brand-700 focus:ring-2 focus:ring-brand-100',
          showAnswer && selectedId === correctId && 'border-emerald-400 bg-emerald-50 text-emerald-900',
          selectedIsWrong && 'border-red-400 bg-red-50 text-red-900',
        selectedIsBlank && 'border-amber-300 bg-amber-50/50',
          disabled && 'cursor-default opacity-100',
        )}
      >
        <option value="">Chọn đáp án...</option>
        {item.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.content}
          </option>
        ))}
      </select>

      {(selectedIsWrong || selectedIsBlank) && correctOption && (
        <p className="mt-1.5 text-xs font-medium text-emerald-700">
          Đáp án đúng: {correctOption.content}
        </p>
      )}
    </div>
  );
}

export function MultipleChoiceRenderer({
  item,
  draft,
  disabled,
  showAnswer,
  onChange,
}: Props) {
  const selectedIds = draft.selectedOptionIds ?? [];
  const correctIds = item.answerKey?.selectedOptionIds ?? [];

  const toggle = (optionId: string) => {
    const next = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    onChange({ selectedOptionIds: next });
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {item.options.map((option) => {
        const selected = selectedIds.includes(option.id);
        const isCorrect = showAnswer && correctIds.includes(option.id);
        const isWrongPick = showAnswer && selected && !correctIds.includes(option.id);

        return (
          <label
            key={option.id}
            className={clsx(
              'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 transition-colors',
              isCorrect && 'border-emerald-400 bg-emerald-50',
              isWrongPick && 'border-red-400 bg-red-50',
              !showAnswer && selected && 'border-ink bg-brand-50',
              !showAnswer && !selected && 'border-brand-200 hover:bg-brand-50',
              disabled && 'cursor-default',
            )}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={disabled}
              onChange={() => toggle(option.id)}
              className="sr-only"
            />
            {option.code && <span className={clsx('grid h-6 min-w-6 shrink-0 place-items-center rounded-md px-1 text-[11px] font-semibold', selected ? 'bg-brand-800 text-white' : 'bg-[#F1F5F9] text-[#334155]')}>{option.code}</span>}
            <span className="text-xs leading-5 sm:text-[13px]">
              {option.content}
            </span>
          </label>
        );
      })}
    </div>
  );
}
