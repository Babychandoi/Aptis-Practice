import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  WRITING_PART_TIPS,
  type WritingCard,
  type WritingPartTip,
} from '@/features/learning/writingPartTips';
import { WRITING_OVERVIEW } from '@/features/learning/writingOverview';

/**
 * Mẹo học Writing, chia tab: Tổng quan + từng Part.
 *
 * Toàn bộ nội dung là tĩnh (writingPartTips.ts, writingOverview.ts) — Writing
 * không có đáp án trong ngân hàng để backend sinh chuỗi như Reading/Listening.
 */

const OVERVIEW_KEY = 'overview';

export function StudyTipsWritingPage() {
  const [tabKey, setTabKey] = useState<string>(OVERVIEW_KEY);
  const activePart = WRITING_PART_TIPS.find((part) => part.key === tabKey);

  const total = WRITING_PART_TIPS.reduce((sum, part) => sum + countTips(part), 0);

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-xs text-stone-500">
        <Link to="/">Trang chủ</Link><span>›</span>
        <Link to="/meo-hoc">Mẹo học</Link><span>›</span>
        <strong className="text-stone-800">Viết</strong>
      </nav>

      <header className="rounded-xl bg-brand-900 px-6 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)]">
        <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-md bg-white/10 px-2 py-0.5">Aptis · Viết</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5">{total} mục</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Mẹo học · Viết</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#c4e1d8]">
          Khung câu và checklist cho từng Part — chép được thẳng vào bài thi.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Các phần Writing">
        <TabButton
          label="Tổng quan"
          count={WRITING_OVERVIEW.criteria.length}
          active={tabKey === OVERVIEW_KEY}
          onClick={() => setTabKey(OVERVIEW_KEY)}
        />
        {WRITING_PART_TIPS.map((part) => (
          <TabButton
            key={part.key}
            label={part.label}
            count={countTips(part)}
            active={part.key === tabKey}
            onClick={() => setTabKey(part.key)}
          />
        ))}
      </div>

      {tabKey === OVERVIEW_KEY && <OverviewPanel onJump={setTabKey} />}

      {activePart && (
        <div className="space-y-3">
          <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
              Aptis · Viết
            </span>
            <h2 className="mt-0.5 text-lg font-semibold">{activePart.label}</h2>
            <p className="mt-1 text-xs leading-5 text-stone-600">{activePart.intro}</p>
          </section>

          {activePart.cards.map((card) => (
            <CardBlock key={card.heading} card={card} />
          ))}
        </div>
      )}

      <Link
        to="/luyen-tap/viet"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
      >
        Bắt đầu luyện viết →
      </Link>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition',
        active
          ? 'border-brand-800 bg-brand-800 text-white'
          : 'border-[#ded5c2] bg-white text-stone-700 hover:border-brand-400',
      )}
    >
      {label}
      <span className={clsx(
        'rounded-full px-1.5 text-[10px] tabular-nums',
        active ? 'bg-white/20' : 'bg-[#f5f3ec] text-stone-500',
      )}>
        {count}
      </span>
    </button>
  );
}

/** Tổng số mẹo + số khung + số bài mẫu, để hiện đếm trên tab. */
function countTips(part: WritingPartTip): number {
  return part.cards.reduce((sum, card) => {
    if (card.kind === 'tips') return sum + card.items.length;
    if (card.kind === 'forms') return sum + card.cards.length;
    return sum + card.articles.length;
  }, 0);
}

function OverviewPanel({ onJump }: { onJump: (tabKey: string) => void }) {
  const o = WRITING_OVERVIEW;
  return (
    <div className="space-y-3">
      <section className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
            {o.kicker}
          </span>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{o.headline}</h2>
          <p className="mt-2 text-xs leading-5 text-stone-600">{o.lead}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {o.formula.map((item, index) => (
              <span key={item.word} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden className="text-stone-400">+</span>}
                <span className="rounded-lg bg-[#eaf4ef] px-3 py-2 text-center">
                  <strong className="block text-sm text-brand-900">{item.word}</strong>
                  <small className="text-[10px] text-brand-800">{item.note}</small>
                </span>
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-[#e6dcc4] bg-[#fdf9ef] p-5">
          <strong className="block text-xs font-semibold text-[#6f5716]">{o.keyRule.title}</strong>
          <p className="mt-1.5 text-xs leading-5 text-[#6f5716]">{o.keyRule.text}</p>
        </aside>
      </section>

      <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
          Giám khảo nhìn gì?
        </span>
        <h2 className="mt-0.5 text-lg font-semibold">4 tiêu chí chấm Writing</h2>
        <p className="mt-1 text-xs leading-5 text-stone-600">
          Ưu tiên độ chính xác và sự rõ ràng trước khi nâng độ khó của câu.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {o.criteria.map((item) => (
            <div key={item.number} className="rounded-lg border border-[#e8e3d6] p-3.5">
              <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                {item.number}
              </span>
              <strong className="mt-0.5 block text-sm">{item.title}</strong>
              <p className="mt-1 text-xs leading-5 text-stone-600">{item.text}</p>
              <small className="mt-1.5 block text-[10px] font-semibold text-brand-800">
                {item.note}
              </small>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
          Quản lý 50 phút
        </span>
        <h2 className="mt-0.5 text-lg font-semibold">4 Part · 4 cách viết khác nhau</h2>
        <p className="mt-1 text-xs leading-5 text-stone-600">
          Đừng dùng một công thức cho toàn bài. Mỗi Part có mục tiêu và mức độ trang trọng riêng.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {o.partMap.map((entry) => (
            <div key={entry.part} className="rounded-lg border border-[#e8e3d6] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-[#eaf4ef] px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                  {entry.part}
                </span>
                <span className="text-[10px] font-semibold tabular-nums text-stone-500">
                  ⏱ {entry.minutes}
                </span>
              </div>
              <strong className="mt-1.5 block text-sm">{entry.title}</strong>
              <span className="text-xs font-semibold text-brand-800">{entry.highlight}</span>
              <p className="mt-1 text-xs leading-5 text-stone-600">{entry.text}</p>

              {entry.example && (
                <code className="mt-2 block rounded-md bg-[#f5f3ec] px-2.5 py-1.5 text-[11px] text-stone-700">
                  {entry.example}
                </code>
              )}
              {entry.tabKey && (
                <button
                  type="button"
                  onClick={() => onJump(entry.tabKey!)}
                  className="mt-2 text-[11px] font-semibold text-brand-800 hover:underline"
                >
                  Mở mẹo {entry.part} →
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
            Tránh mất điểm oan
          </span>
          <h2 className="mt-0.5 text-lg font-semibold">5 lỗi thường gặp</h2>
          <ul className="mt-3 space-y-2.5">
            {o.mistakes.map((item) => (
              <li key={item.number} className="flex gap-2.5">
                <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                  {item.number}
                </span>
                <div>
                  <strong className="block text-xs font-semibold text-stone-900">
                    {item.title}
                  </strong>
                  <span className="text-xs leading-5 text-stone-600">{item.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
            Bộ nối câu an toàn
          </span>
          <h2 className="mt-0.5 text-lg font-semibold">Linking words cần nhớ</h2>
          <div className="mt-3 space-y-2">
            {o.linking.map((group) => (
              <div key={group.label} className="rounded-lg bg-[#f7f9f8] px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                  {group.label}
                </span>
                <p className="text-xs text-stone-700">{group.words}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg border border-[#e6dcc4] bg-[#fdf9ef] px-3 py-2 text-xs leading-5 text-[#6f5716]">
            {o.linkingWarning}
          </p>
        </section>
      </div>
    </div>
  );
}

function CardBlock({ card }: { card: WritingCard }) {
  const count = card.kind === 'tips'
    ? card.items.length
    : card.kind === 'forms' ? card.cards.length : card.articles.length;

  return (
    <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{card.heading}</h3>
        <span className="rounded-full bg-[#f5f3ec] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-stone-500">
          {count}
        </span>
      </div>

      {card.kind === 'tips' && (
        <ul className="mt-3 space-y-2.5">
          {card.items.map((item) => (
            <li key={item.title} className="flex gap-2.5">
              <span aria-hidden className="mt-0.5 text-brand-700">✓</span>
              <div>
                <strong className="block text-xs font-semibold text-stone-900">{item.title}</strong>
                <span className="text-xs leading-5 text-stone-600">{item.text}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {card.kind === 'forms' && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {card.cards.map((form) => (
            <div key={form.head} className="rounded-lg border border-[#e6dcc4] bg-[#fdf9ef] p-3.5">
              <strong className="block text-xs font-semibold text-[#6f5716]">{form.head}</strong>
              <dl className="mt-2 space-y-1.5">
                {form.lines.map((line, index) => (
                  <div key={index} className="flex gap-2 text-xs leading-5">
                    <dt className="w-20 shrink-0 font-semibold text-stone-500">{line.label}</dt>
                    <dd className="text-stone-700">{line.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}

      {card.kind === 'articles' && (
        <div className="mt-3 space-y-3">
          {card.articles.map((article) => (
            <article key={article.head} className="rounded-lg border border-[#e8e3d6] p-3.5">
              <strong className="block text-xs font-semibold text-brand-800">{article.head}</strong>
              {/* Email mẫu giữ nguyên xuống dòng và đoạn trống như bản gốc. */}
              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-stone-700">
                {article.text}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
