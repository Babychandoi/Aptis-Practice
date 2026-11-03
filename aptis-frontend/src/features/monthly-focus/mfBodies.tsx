import { useState } from 'react';
import clsx from 'clsx';
import type { QuestionItem, QuestionSetContent } from '@/types/api';
import {
  matchCorrect,
  opinionBlocks,
  passageSegments,
  topicOf,
  type Answer,
  type Answers,
} from '@/features/monthly-focus/monthlyFocusLogic';
import { MfIcon } from '@/features/monthly-focus/mfUi';

/**
 * Phần thân bài của trình luyện trọng điểm, theo từng dạng — bố cục bám website.
 * `checked` có giá trị sau khi bấm Kiểm tra (hoặc bật Rush Mode): tô xanh câu
 * đúng, đỏ câu sai, và luôn tô xanh đáp án đúng.
 */
export interface BodyProps {
  content: QuestionSetContent;
  answers: Answers;
  onAnswer: (itemId: string, answer: Answer) => void;
  checked: Record<string, boolean> | null;
}

const promptOf = (item: QuestionItem) => item.prompt?.value ?? '';

const selectTone = (checked: boolean | null) =>
  checked === null ? 'border-slate-300 bg-white' : checked ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-red-500 bg-red-50 text-red-700';

// ---------------------------------------------------------------------
// Listening
// ---------------------------------------------------------------------

/** Listening 1 và 4: câu hỏi đậm + thẻ phương án [A | nội dung]. */
export function ChoiceCardsBody({ content, answers, onAnswer, checked }: BodyProps) {
  return (
    <div className="space-y-10">
      {content.items.map((item) => {
        const chosen = answers[item.id];
        const key = item.answerKey?.selectedOptionId;
        return (
          <div key={item.id}>
            <h3 className="border-b border-slate-200 pb-5 text-base font-semibold text-slate-900">{promptOf(item)}</h3>
            <div className="mt-5 space-y-3">
              {item.options.map((option) => {
                const selected = chosen === option.id;
                const isKey = checked !== null && option.id === key;
                const wrong = checked !== null && selected && option.id !== key;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={checked !== null}
                    onClick={() => onAnswer(item.id, option.id)}
                    className={clsx(
                      'flex w-full items-stretch overflow-hidden rounded-lg border text-left transition-colors',
                      isKey ? 'border-emerald-400 bg-emerald-50'
                        : wrong ? 'border-red-400 bg-red-50'
                          : selected ? 'border-slate-400 bg-slate-200/70' : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <span className={clsx('grid w-16 shrink-0 place-items-center border-r py-5 text-base font-semibold',
                      isKey ? 'border-emerald-300 text-emerald-700' : wrong ? 'border-red-300 text-red-600' : 'border-slate-200 text-slate-800')}>
                      {option.code ?? option.id}
                    </span>
                    <span className={clsx('flex items-center px-4 py-5 text-sm', isKey ? 'font-semibold text-slate-900' : 'text-slate-800')}>{option.content}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Listening 2: "Speaker n" + ô chọn ý. */
export function SpeakerSelectBody({ content, answers, onAnswer, checked }: BodyProps) {
  return (
    <div className="space-y-4">
      {content.items.map((item, i) => (
        <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <span className="w-24 shrink-0 font-semibold text-slate-900">Speaker {i + 1}</span>
          <select
            value={(answers[item.id] as string) ?? ''}
            disabled={checked !== null}
            onChange={(e) => onAnswer(item.id, e.target.value)}
            className={clsx('w-full rounded-md border px-3 py-2.5 text-sm', selectTone(checked ? checked[item.id] ?? false : null))}
          >
            <option value="">Select option</option>
            {item.options.map((o) => <option key={o.id} value={o.id}>{o.content}</option>)}
          </select>
          {checked && !checked[item.id] && (
            <span className="shrink-0 text-xs font-semibold text-emerald-700 sm:w-48">
              ✓ {item.options.find((o) => o.id === item.answerKey?.selectedOptionId)?.content}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Listening 3: nhận định đánh số + ô chọn Man / Woman / Both. */
export function StatementSelectBody({ content, answers, onAnswer, checked }: BodyProps) {
  return (
    <div className="space-y-4">
      {content.items.map((item, i) => (
        <div key={item.id} className="flex items-center gap-4">
          <span className="w-6 shrink-0 font-semibold text-slate-900">{i + 1}.</span>
          <span className="flex-1 text-slate-900">{promptOf(item)}</span>
          <select
            value={(answers[item.id] as string) ?? ''}
            disabled={checked !== null}
            onChange={(e) => onAnswer(item.id, e.target.value)}
            className={clsx('w-36 shrink-0 rounded-md border px-3 py-2.5 text-sm', selectTone(checked ? checked[item.id] ?? false : null))}
          >
            <option value="">Select</option>
            {item.options.map((o) => <option key={o.id} value={o.id}>{o.content}</option>)}
          </select>
          {checked && !checked[item.id] && (
            <span className="w-16 shrink-0 text-xs font-semibold text-emerald-700">
              ✓ {item.options.find((o) => o.id === item.answerKey?.selectedOptionId)?.content}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------

function DictionaryTip() {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs italic text-purple-700">
      <MfIcon name="bulb" className="h-3.5 w-3.5 text-amber-500" />
      Tip: Đọc lướt cả đoạn trước, rồi mới chọn đáp án cho từng chỗ trống
    </p>
  );
}

/** Reading 1: đoạn văn với ô chọn ngay tại chỗ trống. */
export function GapPassageBody({ content, answers, onAnswer, checked }: BodyProps) {
  // Đoạn văn để dòng trống giữa các câu; mỗi dòng đã cao bằng ô chọn nên gộp lại cho khỏi thưa.
  const text = (content.stimulus?.value ?? content.items.map(promptOf).join('\n')).replace(/\n\s*\n/g, '\n');
  const segments = passageSegments(text);
  return (
    <div>
      <DictionaryTip />
      <div className="mt-6 whitespace-pre-line text-[15px] leading-[4rem] text-slate-900">
        {segments.map((seg, i) => {
          if (seg.kind === 'text') return <span key={i}>{seg.value}</span>;
          const item = content.items[seg.index];
          if (!item) return <span key={i}>____</span>;
          const ok = checked ? checked[item.id] ?? false : null;
          return (
            <span key={i} className="inline-flex items-center gap-1 align-middle">
              <select
                value={(answers[item.id] as string) ?? ''}
                disabled={checked !== null}
                onChange={(e) => onAnswer(item.id, e.target.value)}
                className={clsx('mx-1 rounded-md border px-3 py-2 text-sm leading-normal', selectTone(ok))}
              >
                <option value="">Chọn đáp án</option>
                {item.options.map((o) => <option key={o.id} value={o.id}>{o.content}</option>)}
              </select>
              {ok === false && (
                <span className="text-xs font-semibold text-emerald-700">✓ {item.options.find((o) => o.id === item.answerKey?.selectedOptionId)?.content}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Reading 2&3: kéo câu vào ô. Bấm một câu cũng được — câu vào ô trống đầu tiên;
 * bấm ô đã có câu để trả câu về danh sách.
 */
export function OrderingBody({ content, answers, onAnswer, checked }: BodyProps) {
  const item = content.items[0]!;
  const slots = Array.from({ length: item.options.length }, (_, i) => ((answers[item.id] as string[] | undefined) ?? [])[i] ?? '');
  const pool = item.options.filter((o) => !slots.includes(o.id));
  const [dragging, setDragging] = useState<string | null>(null);
  const expected = item.answerKey?.orderedOptionIds ?? [];
  const textOf = (id: string) => item.options.find((o) => o.id === id)?.content ?? '';

  const place = (id: string, index: number) => {
    const next = slots.map((s) => (s === id ? '' : s));
    next[index] = id;
    onAnswer(item.id, next);
  };
  const putFirstEmpty = (id: string) => {
    const index = slots.indexOf('');
    if (index >= 0) place(id, index);
  };
  const clearSlot = (index: number) => onAnswer(item.id, slots.map((s, i) => (i === index ? '' : s)));
  const locked = checked !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-bold text-slate-900">{topicOf(content) ?? content.title}</h3>
        <div className="mt-3 space-y-3">
          {slots.map((id, i) => {
            const state = locked ? (id === expected[i] ? 'ok' : 'bad') : null;
            return (
              <div
                key={i}
                onDragOver={(e) => { if (!locked) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); if (dragging) place(dragging, i); setDragging(null); }}
                onClick={() => { if (!locked && id) clearSlot(i); }}
                className={clsx(
                  'min-h-[56px] rounded-lg border px-4 py-3 text-sm',
                  !id ? 'grid place-items-center border-dashed border-slate-300 text-slate-400'
                    : state === 'ok' ? 'border-emerald-400 bg-emerald-50 text-slate-900'
                      : state === 'bad' ? 'border-red-400 bg-red-50 text-slate-900' : 'cursor-pointer border-slate-300 bg-slate-50 text-slate-900',
                )}
              >
                {id ? textOf(id) : 'Kéo câu vào đây'}
                {state === 'bad' && <p className="mt-1 text-xs font-semibold text-emerald-700">✓ {textOf(expected[i] ?? '')}</p>}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-3 flex items-center gap-2 text-sm text-slate-500"><MfIcon name="arrowLeft" className="h-4 w-4" /> Kéo câu vào đây</p>
        <div className="space-y-3">
          {pool.map((o) => (
            <button
              key={o.id}
              type="button"
              draggable={!locked}
              disabled={locked}
              onDragStart={() => setDragging(o.id)}
              onDragEnd={() => setDragging(null)}
              onClick={() => putFirstEmpty(o.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left text-sm text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.05)] hover:border-slate-300"
            >
              <MfIcon name="grip" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" strokeWidth={3} />
              {o.content}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Reading 4 (web): đoạn của bốn người bên trái, nhận định + "Chọn người" bên phải. */
export function OpinionBody({ content, answers, onAnswer, checked }: BodyProps) {
  const item = content.items[0]!;
  const { topic, people } = opinionBlocks(content.stimulus?.value ?? '');
  const value = (answers[item.id] as Record<string, string> | undefined) ?? {};
  return (
    <div>
      {topic && <h2 className="text-2xl font-bold text-slate-900">{topic}</h2>}
      {content.instructions && <p className="mt-4 text-lg font-bold leading-8 text-slate-900">{content.instructions}</p>}
      <div className="mt-6"><DictionaryTip /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {people.map((p) => (
            <div key={p.label}>
              <h3 className="font-bold text-slate-900">{p.label}</h3>
              <p className="mt-2 whitespace-pre-line leading-7 text-slate-800">{p.text}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {item.leftItems.map((left, i) => {
            const ok = checked ? matchCorrect(item, value, left.id) : null;
            return (
              <div key={left.id} className={clsx('flex items-center gap-3 rounded-xl border p-3', ok === null ? 'border-slate-200' : ok ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50')}>
                <p className="flex-1 font-semibold text-slate-900">{i + 1}. {left.content}</p>
                <select
                  value={value[left.id] ?? ''}
                  disabled={checked !== null}
                  onChange={(e) => onAnswer(item.id, { ...value, [left.id]: e.target.value })}
                  className="w-36 shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Chọn người</option>
                  {item.rightItems.map((r) => <option key={r.id} value={r.id}>{r.content}</option>)}
                </select>
                {ok === false && (
                  <span className="shrink-0 text-xs font-semibold text-emerald-700">
                    ✓ {item.rightItems.find((r) => r.id === item.answerKey?.matches?.[left.id])?.content}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Reading 5: mỗi đoạn văn có ô "Chọn tiêu đề phù hợp" phía trên. */
export function HeadingBody({ content, answers, onAnswer, checked }: BodyProps) {
  const item = content.items[0]!;
  const value = (answers[item.id] as Record<string, string> | undefined) ?? {};
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{content.title}</h2>
      <div className="mt-4"><DictionaryTip /></div>
      <div className="mt-6 space-y-6">
        {item.leftItems.map((para) => {
          const ok = checked ? matchCorrect(item, value, para.id) : null;
          return (
            <div key={para.id} className={clsx('rounded-xl border-2 p-4', ok === null ? 'border-slate-200' : ok ? 'border-emerald-300 bg-emerald-50/40' : 'border-red-300 bg-red-50/40')}>
              <select
                value={value[para.id] ?? ''}
                disabled={checked !== null}
                onChange={(e) => onAnswer(item.id, { ...value, [para.id]: e.target.value })}
                className="w-full max-w-[300px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Chọn tiêu đề phù hợp</option>
                {item.rightItems.map((h) => <option key={h.id} value={h.id}>{h.content}</option>)}
              </select>
              {ok === false && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  ✓ {item.rightItems.find((h) => h.id === item.answerKey?.matches?.[para.id])?.content}
                </p>
              )}
              <p className="mt-4 leading-7 text-slate-900">{para.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
