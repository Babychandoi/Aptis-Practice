import clsx from 'clsx';
import type { QuestionItem } from '@/types/api';
import type { ResponseDraft } from '@/features/practice/responseState';

interface Props {
  item: QuestionItem;
  draft: ResponseDraft;
  disabled: boolean;
  showAnswer: boolean;
  onChange: (draft: ResponseDraft) => void;
}

/**
 * Sắp xếp câu bằng nút lên/xuống. Không dùng drag-and-drop để chạy được trên
 * mobile và bàn phím.
 */
export function OrderingRenderer({ item, draft, disabled, showAnswer, onChange }: Props) {
  const fixedFirstOptionId = typeof item.constraints?.fixedFirstOptionId === 'string'
    ? item.constraints.fixedFirstOptionId
    : undefined;
  const fixedOption = fixedFirstOptionId
    ? item.options.find((option) => option.id === fixedFirstOptionId)
    : undefined;
  const movableOptions = fixedFirstOptionId
    ? item.options.filter((option) => option.id !== fixedFirstOptionId)
    : item.options;
  // Chưa trả lời thì hiển thị theo thứ tự options gốc (đã được backend trộn)
  const order = draft.orderedOptionIds?.length
    ? draft.orderedOptionIds.filter((id) => id !== fixedFirstOptionId)
    : movableOptions.map((option) => option.id);

  const correctOrder = item.answerKey?.orderedOptionIds ?? [];
  const scoredCorrectOrder = correctOrder.filter((id) => id !== fixedFirstOptionId);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    const current = next[index];
    const swap = next[target];
    if (current === undefined || swap === undefined) return;

    next[index] = swap;
    next[target] = current;
    onChange({ orderedOptionIds: next });
  };

  return (
    <div className="space-y-2">
      {fixedOption && <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">1</span>
        <p className="flex-1 text-sm">{fixedOption.content}</p>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand-700">Câu mẫu cố định</span>
      </div>}
      {order.map((optionId, index) => {
        const option = item.options.find((o) => o.id === optionId);
        if (!option) return null;

        const inRightPlace = showAnswer && scoredCorrectOrder[index] === optionId;
        const inWrongPlace = showAnswer && scoredCorrectOrder[index] !== optionId;

        return (
          <div
            key={optionId}
            className={clsx(
              'flex items-start gap-3 rounded-lg border px-3 py-2.5',
              inRightPlace && 'border-emerald-400 bg-emerald-50',
              inWrongPlace && 'border-red-400 bg-red-50',
              !showAnswer && 'border-slate-200',
            )}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
              {index + (fixedOption ? 2 : 1)}
            </span>

            <p className="flex-1 text-sm">{option.content}</p>

            {!disabled && (
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Di chuyển lên"
                  className="rounded px-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label="Di chuyển xuống"
                  className="rounded px-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        );
      })}

      {showAnswer && correctOrder.length > 0 && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <p className="font-semibold">Thứ tự đúng:</p>
          <ol className="mt-1 list-decimal pl-5">
            {correctOrder.map((id) => (
              <li key={id}>{item.options.find((o) => o.id === id)?.content ?? id}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
