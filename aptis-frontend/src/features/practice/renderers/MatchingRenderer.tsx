import clsx from 'clsx';
import type { QuestionItem, QuestionSection } from '@/types/api';
import type { ResponseDraft } from '@/features/practice/responseState';

interface Props {
  item: QuestionItem;
  /** Dùng cho heading matching: đoạn văn nằm ở sections của cả bộ, không ở item */
  sections: QuestionSection[];
  draft: ResponseDraft;
  disabled: boolean;
  showAnswer: boolean;
  onChange: (draft: ResponseDraft) => void;
}

/**
 * Nối cặp bằng dropdown thay vì drag-and-drop: hoạt động được trên mobile và
 * với trình đọc màn hình, đủ cho Reading Part 3/4 và Listening Part 2.
 */
export function MatchingRenderer({
  item,
  sections,
  draft,
  disabled,
  showAnswer,
  onChange,
}: Props) {
  const matches = draft.matches ?? {};
  const correctMatches = item.answerKey?.matches ?? {};

  // Bên trái lấy từ leftItems; nếu trống thì dùng sections (heading matching)
  const leftEntries =
    item.leftItems.length > 0
      ? item.leftItems.map((left) => ({ id: left.id, label: left.code, content: left.content }))
      : sections.map((section) => ({
          id: section.id,
          label: section.label,
          content: section.content.value,
        }));

  // Bên phải lấy từ rightItems; nếu trống thì dùng options
  const rightOptions = item.rightItems.length > 0 ? item.rightItems : item.options;

  const setMatch = (leftId: string, rightId: string) => {
    const next = { ...matches };
    if (rightId) {
      next[leftId] = rightId;
    } else {
      delete next[leftId];
    }
    onChange({ matches: next });
  };

  return (
    <div className="space-y-3">
      {leftEntries.map((left) => {
        const picked = matches[left.id] ?? '';
        const correct = correctMatches[left.id];
        const isCorrect = showAnswer && picked === correct;
        const isWrong = showAnswer && picked !== '' && picked !== correct;

        return (
          <div
            key={left.id}
            className={clsx(
              'rounded-lg border p-3',
              isCorrect && 'border-emerald-400 bg-emerald-50',
              isWrong && 'border-red-400 bg-red-50',
              !showAnswer && 'border-slate-200',
            )}
          >
            {left.label && (
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {left.label}
              </p>
            )}
            <div
              className="question-content text-sm"
              // Nội dung là HTML do biên tập viên soạn, đã qua kiểm duyệt trước khi publish
              dangerouslySetInnerHTML={{ __html: left.content }}
            />

            <select
              value={picked}
              disabled={disabled}
              onChange={(e) => setMatch(left.id, e.target.value)}
              className="input mt-2"
            >
              <option value="">— Chọn —</option>
              {rightOptions.map((right) => (
                <option key={right.id} value={right.id}>
                  {right.code ? `${right.code}. ` : ''}
                  {right.content}
                </option>
              ))}
            </select>

            {isWrong && correct && (
              <p className="mt-1.5 text-xs text-emerald-700">
                Đáp án đúng: {rightOptions.find((r) => r.id === correct)?.content ?? correct}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
