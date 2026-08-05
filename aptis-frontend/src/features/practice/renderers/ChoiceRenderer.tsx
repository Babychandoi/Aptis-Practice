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
    <div className="space-y-2">
      {item.options.map((option) => {
        const selected = draft.selectedOptionId === option.id;
        const isCorrect = showAnswer && correctId === option.id;
        const isWrongPick = showAnswer && selected && correctId !== option.id;

        return (
          <label
            key={option.id}
            className={clsx(
              'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
              isCorrect && 'border-emerald-400 bg-emerald-50',
              isWrongPick && 'border-red-400 bg-red-50',
              !showAnswer && selected && 'border-brand-500 bg-brand-50',
              !showAnswer && !selected && 'border-slate-200 hover:bg-slate-50',
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
              className="mt-0.5"
            />
            <span className="text-sm">
              {option.code && <span className="mr-1.5 font-semibold">{option.code}.</span>}
              {option.content}
            </span>
          </label>
        );
      })}
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
    <div className="space-y-2">
      {item.options.map((option) => {
        const selected = selectedIds.includes(option.id);
        const isCorrect = showAnswer && correctIds.includes(option.id);
        const isWrongPick = showAnswer && selected && !correctIds.includes(option.id);

        return (
          <label
            key={option.id}
            className={clsx(
              'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
              isCorrect && 'border-emerald-400 bg-emerald-50',
              isWrongPick && 'border-red-400 bg-red-50',
              !showAnswer && selected && 'border-brand-500 bg-brand-50',
              !showAnswer && !selected && 'border-slate-200 hover:bg-slate-50',
              disabled && 'cursor-default',
            )}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={disabled}
              onChange={() => toggle(option.id)}
              className="mt-0.5"
            />
            <span className="text-sm">
              {option.code && <span className="mr-1.5 font-semibold">{option.code}.</span>}
              {option.content}
            </span>
          </label>
        );
      })}
    </div>
  );
}
