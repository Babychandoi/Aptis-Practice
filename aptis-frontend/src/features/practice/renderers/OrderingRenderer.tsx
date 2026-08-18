import { useState } from 'react';
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
 * Sắp xếp câu bằng kéo thả, giống thao tác của đề thi thật.
 *
 * <p>Nút lên/xuống được giữ lại song song: drag-and-drop của HTML5 không hoạt
 * động trên phần lớn trình duyệt di động và không dùng được bằng bàn phím, nên
 * nếu chỉ có kéo thả thì một phần học viên sẽ không làm được bài.
 *
 * <p>Dùng HTML5 drag API thuần thay vì thêm thư viện dnd: chỉ cần đổi thứ tự
 * một danh sách phẳng, không đáng thêm dependency.
 */
export function OrderingRenderer({ item, draft, disabled, showAnswer, onChange }: Props) {
  /** Câu đang được kéo và câu đang bị kéo qua, chỉ để vẽ trạng thái. */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
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

  /** Bỏ câu đang kéo ra rồi chèn vào trước vị trí thả. */
  const moveTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    const from = order.indexOf(fromId);
    const to = order.indexOf(toId);
    if (from < 0 || to < 0) return;

    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    onChange({ orderedOptionIds: next });
  };

  const endDrag = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  /** Vị trí đúng (1-based, tính cả câu mẫu nếu có) của một câu. */
  const correctPositionOf = (optionId: string): number | null => {
    const index = scoredCorrectOrder.indexOf(optionId);
    return index < 0 ? null : index + (fixedOption ? 2 : 1);
  };

  return (
    <div className="space-y-2">
      {!disabled && !showAnswer && (
        <p className="text-[11px] text-stone-500">
          Kéo thả câu để sắp xếp, hoặc dùng nút ▲▼.
        </p>
      )}
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

        const draggable = !disabled;

        return (
          <div
            key={optionId}
            draggable={draggable}
            onDragStart={draggable ? () => setDraggingId(optionId) : undefined}
            onDragEnd={draggable ? endDrag : undefined}
            onDragOver={draggable ? (event) => {
              // Bắt buộc preventDefault, nếu không trình duyệt không cho thả
              event.preventDefault();
              setDragOverId(optionId);
            } : undefined}
            onDragLeave={draggable ? () => {
              setDragOverId((current) => (current === optionId ? null : current));
            } : undefined}
            onDrop={draggable ? (event) => {
              event.preventDefault();
              if (draggingId) moveTo(draggingId, optionId);
              endDrag();
            } : undefined}
            className={clsx(
              'flex items-start gap-3 rounded-lg border px-3 py-2.5 transition',
              inRightPlace && 'border-emerald-400 bg-emerald-50',
              inWrongPlace && 'border-red-400 bg-red-50',
              !showAnswer && 'border-slate-200',
              draggable && 'cursor-grab active:cursor-grabbing',
              draggingId === optionId && 'opacity-40',
              dragOverId === optionId && draggingId !== optionId && 'border-brand-500 bg-brand-50',
            )}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">
              {index + (fixedOption ? 2 : 1)}
            </span>

            <div className="flex-1">
              <p className="text-sm">{option.content}</p>
              {inWrongPlace && correctPositionOf(optionId) !== null && (
                <p className="mt-1 text-[11px] font-medium text-emerald-700">
                  → Câu này đúng ở vị trí {correctPositionOf(optionId)}
                </p>
              )}
            </div>

            {!disabled && (
              <div className="flex shrink-0 items-start gap-1">
                <span aria-hidden="true" className="mt-0.5 select-none px-1 text-base leading-none text-slate-400" title="Kéo để sắp xếp">⠿</span>
                <div className="flex flex-col gap-1">
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
              </div>
            )}
          </div>
        );
      })}

      {showAnswer && correctOrder.length > 0 && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
          <p className="font-semibold">Đáp án đúng — thứ tự các câu:</p>
          <ol className="mt-1.5 space-y-1">
            {correctOrder.map((id, index) => (
              <li key={id} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
                  {index + 1}
                </span>
                <span className="flex-1">{item.options.find((o) => o.id === id)?.content ?? id}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
