import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  SPEAKING_SECTIONS,
  type SpeakingSection,
} from '@/features/learning/speakingTips';

/**
 * Mẹo học Speaking, chia tab: Tổng quan + từng Part.
 *
 * Nội dung tĩnh (speakingTips.ts). Mỗi tab lắp các khối tuỳ theo Part có gì:
 * khung nhịp, khung câu, bảng mốc giây, ngân hàng câu hỏi, phrase bank, checklist.
 */

export function StudyTipsSpeakingPage() {
  const [tabKey, setTabKey] = useState(SPEAKING_SECTIONS[0]?.key ?? '');
  const active = SPEAKING_SECTIONS.find((s) => s.key === tabKey) ?? SPEAKING_SECTIONS[0];

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-xs text-stone-500">
        <Link to="/">Trang chủ</Link><span>›</span>
        <Link to="/meo-hoc">Mẹo học</Link><span>›</span>
        <strong className="text-stone-800">Nói</strong>
      </nav>

      <header className="rounded-xl bg-brand-900 px-6 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)]">
        <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-md bg-white/10 px-2 py-0.5">Aptis · Nói</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5">4 phần</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Mẹo học · Nói</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#c4e1d8]">
          Nhớ khung ý, nói bằng trải nghiệm của chính bạn — không học thuộc bài mẫu.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Các phần Speaking">
        {SPEAKING_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            role="tab"
            aria-selected={section.key === active?.key}
            onClick={() => setTabKey(section.key)}
            className={clsx(
              'rounded-lg border px-4 py-2 text-sm font-semibold transition',
              section.key === active?.key
                ? 'border-brand-800 bg-brand-800 text-white'
                : 'border-[#ded5c2] bg-white text-stone-700 hover:border-brand-400',
            )}
          >
            {section.label}
          </button>
        ))}
      </div>

      {active && <SectionPanel section={active} />}

      <Link
        to="/luyen-tap/noi"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-900"
      >
        Bắt đầu luyện nói →
      </Link>
    </div>
  );
}

/**
 * Thư viện bài gộp Part 4: tìm theo tiêu đề hoặc từ khoá, mở từng bài để đọc.
 *
 * Bài chưa soạn nội dung vẫn hiện trong danh sách — từ khoá của nó giúp học viên
 * biết đề đang hỏi thuộc nhóm nào.
 */
function TopicLibrary({
  library,
}: {
  library: NonNullable<SpeakingSection['topicLibrary']>;
}) {
  const [keyword, setKeyword] = useState('');
  const [openTitle, setOpenTitle] = useState<string | null>(
    library.entries[0]?.title ?? null,
  );

  const term = keyword.trim().toLowerCase();
  const filtered = term
    ? library.entries.filter((entry) =>
        entry.title.toLowerCase().includes(term)
        || entry.tags.some((tag) => tag.includes(term)))
    : library.entries;

  return (
    <section className="rounded-xl border border-[#dfe5dd] bg-white">
      <header className="border-b border-[#eee9dc] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
              Thư viện Part 4
            </span>
            <h3 className="text-lg font-semibold">{library.title}</h3>
          </div>
          <strong className="text-2xl font-semibold tabular-nums text-brand-800">
            {library.entries.length}
          </strong>
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-600">{library.note}</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs text-stone-600">
            <span className="sr-only">Tìm chủ đề hoặc tình huống</span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Ví dụ: job interview, teamwork, travel…"
              className="w-72 rounded-lg border border-[#ded5c2] px-3 py-2 text-xs"
            />
          </label>
          <span aria-live="polite" className="text-[11px] text-stone-500">
            {filtered.length} / {library.entries.length} chủ đề
          </span>
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-stone-500">
          Không có chủ đề nào khớp “{keyword}”.
        </p>
      ) : (
        <ul className="divide-y divide-[#f1ece0]">
          {filtered.map((entry) => {
            const expanded = openTitle === entry.title;
            const index = library.entries.indexOf(entry) + 1;
            return (
              <li key={entry.title} className={clsx('px-5 py-3', expanded && 'bg-[#f9fbfa]')}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpenTitle(expanded ? null : entry.title)}
                  className="flex w-full flex-wrap items-center gap-3 text-left"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#f5f3ec] text-[10px] font-semibold tabular-nums text-stone-500">
                    {String(index).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm">{entry.title}</strong>
                    <span className="mt-1 flex flex-wrap gap-1" lang="en">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-[#f5f3ec] px-1.5 py-0.5 text-[10px] text-stone-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg border border-[#ded5c2] px-3 py-1.5 text-[11px] font-semibold text-stone-700">
                    {expanded ? 'Thu gọn ▲' : 'Xem bài ▼'}
                  </span>
                </button>

                {expanded && (
                  <div className="mt-2.5 space-y-2 pl-9">
                    <p className="rounded-lg bg-[#fdf9ef] px-3 py-2 text-xs leading-5 text-[#6f5716]">
                      <strong>Cách học:</strong> đánh dấu bối cảnh, diễn biến, cảm xúc và bài học.
                      Sau đó kể lại bằng chi tiết của riêng bạn.
                    </p>
                    <div lang="en" className="space-y-2">
                      {entry.paragraphs.map((paragraph, position) => (
                        <p key={position} className="text-xs leading-6 text-stone-700">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SectionPanel({ section }: { section: SpeakingSection }) {
  return (
    <div className="space-y-3">
      <section className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
            {section.eyebrow}
          </span>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">
            {section.title} <em className="not-italic text-brand-700">{section.titleEm}</em>
          </h2>
          <p className="mt-2 text-xs leading-5 text-stone-600">{section.lead}</p>
        </div>

        {section.principle && (
          <aside className="rounded-xl border border-[#e6dcc4] bg-[#fdf9ef] p-5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6f5716]">
              {section.principle.label}
            </span>
            <strong className="mt-0.5 block text-sm text-[#6f5716]">
              {section.principle.title}
            </strong>
            <p className="mt-1 text-xs leading-5 text-[#6f5716]">{section.principle.text}</p>
          </aside>
        )}

        {section.badge && (
          <aside className="flex items-center justify-around gap-3 rounded-xl border border-[#dfe5dd] bg-white p-5 text-center">
            {(Array.isArray(section.badge) ? section.badge : [section.badge]).map((badge) => (
              <div key={badge.value}>
                <strong className="block text-2xl font-semibold tabular-nums text-brand-800">
                  {badge.value}
                </strong>
                <span className="text-xs text-stone-600">{badge.note}</span>
              </div>
            ))}
          </aside>
        )}
      </section>

      {section.examNote && (
        <p className="rounded-xl border border-[#e6dcc4] bg-[#fdf9ef] px-5 py-3.5 text-xs leading-5 text-[#6f5716]">
          <strong>{section.examNote.title}</strong> {section.examNote.text}
        </p>
      )}

      {section.prepPlan && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.prepPlan.title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{section.prepPlan.note}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {section.prepPlan.branches.map((branch) => (
              <div key={branch.code} className="rounded-lg border border-[#e8e3d6] p-3.5">
                <span className="rounded-md bg-[#eaf4ef] px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                  {branch.code}
                </span>
                <strong className="mt-1.5 block text-xs">{branch.title}</strong>
                <p className="mt-0.5 text-[11px] leading-4 text-stone-600">{branch.text}</p>
              </div>
            ))}
          </div>
          <aside className="mt-3 rounded-lg border border-[#e6dcc4] bg-[#fdf9ef] p-3.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6f5716]">
              {section.prepPlan.example.title}
            </span>
            <dl className="mt-1.5 space-y-1">
              {section.prepPlan.example.lines.map((line) => (
                <div key={line.label} className="flex gap-2 text-xs leading-5">
                  <dt className="w-7 shrink-0 font-semibold text-[#6f5716]">{line.label}</dt>
                  <dd lang="en" className="text-stone-700">{line.text}</dd>
                </div>
              ))}
            </dl>
            <small className="mt-1.5 block text-[11px] text-[#6f5716]">
              {section.prepPlan.example.note}
            </small>
          </aside>
        </section>
      )}

      {section.topicWeave && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.topicWeave.title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{section.topicWeave.note}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {section.topicWeave.steps.map((step) => (
              <div key={step.number} className="rounded-lg bg-[#f7f9f8] p-3">
                <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                  {step.number}
                </span>
                <strong className="block text-xs">{step.title}</strong>
                <small className="text-[11px] leading-4 text-stone-600">{step.note}</small>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg border border-[#e6dcc4] bg-[#fdf9ef] px-3.5 py-2.5 text-xs leading-5 text-[#6f5716]">
            <strong>{section.topicWeave.exampleTitle}</strong> {section.topicWeave.exampleText}
          </p>
        </section>
      )}

      {section.lengthen && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.lengthen.title}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {section.lengthen.items.map((item) => (
              <div key={item.title} className="rounded-lg border border-[#e8e3d6] p-3.5">
                <strong className="block text-xs font-semibold">{item.title}</strong>
                <span lang="en" className="block text-[11px] font-semibold text-brand-800">
                  {item.question}
                </span>
                <p className="mt-1 text-[11px] leading-4 text-stone-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.runTrack && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.runTrack.title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{section.runTrack.note}</p>
          <ol className="mt-3 space-y-1.5">
            {section.runTrack.steps.map((step) => (
              <li
                key={step.range}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg bg-[#f7f9f8] px-3.5 py-2.5"
              >
                <strong className="w-20 shrink-0 text-xs font-semibold tabular-nums text-brand-800">
                  {step.range}
                </strong>
                <span className="text-xs font-semibold">{step.title}</span>
                <em lang="en" className="text-[11px] not-italic text-stone-600">{step.phrase}</em>
              </li>
            ))}
          </ol>
        </section>
      )}

      {section.phraseLibrary && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
            Phrase bank đầy đủ
          </span>
          <h3 className="mt-0.5 text-sm font-semibold">{section.phraseLibrary.title}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {section.phraseLibrary.groups.map((group) => (
              <div key={group.label} className="rounded-lg border border-[#e8e3d6] p-3.5">
                <strong className="block text-xs font-semibold text-brand-800">
                  {group.label}
                </strong>
                <ul className="mt-1.5 space-y-0.5" lang="en">
                  {group.phrases.map((phrase) => (
                    <li key={phrase} className="text-xs leading-5 text-stone-700">{phrase}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.storyBanks && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.storyBanks.title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{section.storyBanks.note}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {section.storyBanks.items.map((item) => (
              <div key={item.title} className="rounded-lg border border-[#e8e3d6] px-3.5 py-2.5">
                <strong className="block text-xs font-semibold">{item.title}</strong>
                <span className="text-[11px] leading-4 text-stone-600">{item.question}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.topicLibrary && <TopicLibrary library={section.topicLibrary} />}

      {section.formatCards && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">Cấu trúc bốn phần Aptis Speaking</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {section.formatCards.map((card) => (
              <div key={card.part} className="rounded-lg border border-[#e8e3d6] p-3.5">
                <span className="rounded-md bg-[#eaf4ef] px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                  {card.part}
                </span>
                <strong className="mt-1.5 block text-sm">{card.title}</strong>
                <span className="text-xs font-semibold text-brand-800">{card.time}</span>
                <p className="mt-1 text-xs leading-5 text-stone-600">{card.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.formula && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
            {section.formula.eyebrow}
          </span>
          <h3 className="mt-0.5 text-sm font-semibold">{section.formula.title}</h3>

          <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {section.formula.steps.map((step) => (
              <li key={step.number} className="rounded-lg bg-[#f7f9f8] p-3">
                <span className="text-[10px] font-semibold tabular-nums text-stone-400">
                  {step.number}
                </span>
                <strong className="block text-xs">{step.title}</strong>
                <small className="text-[11px] leading-4 text-stone-600">{step.note}</small>
              </li>
            ))}
          </ol>

          {section.formula.example && (
            <blockquote
              lang="en"
              className="mt-3 rounded-lg border-l-4 border-brand-600 bg-[#eaf4ef] px-3.5 py-2.5"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                Ví dụ khung
              </span>
              <p className="mt-1 text-xs leading-5 text-brand-900">{section.formula.example}</p>
            </blockquote>
          )}
        </section>
      )}

      {section.frameworks && (
        <div className="grid gap-3 lg:grid-cols-2">
          {section.frameworks.map((framework) => (
            <section
              key={framework.tag}
              className="rounded-xl border border-[#dfe5dd] bg-white p-5"
            >
              <span className="rounded-md bg-[#eaf4ef] px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                {framework.tag}
              </span>
              <h3 className="mt-1.5 text-sm font-semibold">{framework.title}</h3>
              <p className="mt-1.5 text-xs text-stone-600">{framework.flow.join(' → ')}</p>
              <div className={clsx('space-y-1', framework.phrases.length > 0 && 'mt-2.5')} lang="en">
                {framework.phrases.map((phrase) => (
                  <p key={phrase} className="rounded-md bg-[#f7f9f8] px-2.5 py-1.5 text-xs text-stone-700">
                    {phrase}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {section.timing && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.timing.title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{section.timing.note}</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {section.timing.columns.map((column) => (
              <div key={column.label} className="rounded-lg border border-[#e8e3d6] p-3.5">
                <strong className="block text-xs font-semibold text-brand-800">
                  {column.label}
                </strong>
                <ol className="mt-2 space-y-1.5">
                  {column.rows.map((row) => (
                    <li key={row.range} className="flex gap-2 text-xs leading-5">
                      <span className="w-14 shrink-0 font-semibold tabular-nums text-stone-500">
                        {row.range}
                      </span>
                      <span className="text-stone-700">{row.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.compareTrack && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.compareTrack.title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{section.compareTrack.note}</p>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {section.compareTrack.steps.map((step) => (
              <li key={step.range} className="rounded-lg bg-[#f7f9f8] p-3">
                <strong className="block text-xs font-semibold tabular-nums text-brand-800">
                  {step.range}
                </strong>
                <span className="block text-xs font-semibold">{step.title}</span>
                <em lang="en" className="text-[11px] not-italic text-stone-600">{step.phrase}</em>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {section.compareTrack.contrastPairs.map((pair) => (
              <span
                key={pair}
                lang="en"
                className="rounded-md bg-[#eaf4ef] px-2.5 py-1 text-xs font-semibold text-brand-800"
              >
                {pair}
              </span>
            ))}
          </div>
        </section>
      )}

      {section.dimensions && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.dimensions.title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{section.dimensions.note}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {section.dimensions.items.map((item) => (
              <div key={item.title} className="rounded-lg border border-[#e8e3d6] px-3.5 py-2.5">
                <strong className="block text-xs font-semibold">{item.title}</strong>
                <span className="text-[11px] leading-4 text-stone-600">{item.question}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.compareModel && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.compareModel.title}</h3>
          <p lang="en" className="mt-2 rounded-lg bg-[#eaf4ef] px-3.5 py-2.5 text-xs leading-6 text-brand-900">
            {section.compareModel.text}
          </p>
          <small className="mt-1.5 block text-[11px] text-stone-600">
            {section.compareModel.note}
          </small>
        </section>
      )}

      {section.modelLab && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <span className="rounded-md bg-[#eaf4ef] px-2 py-0.5 text-[10px] font-semibold text-brand-800">
            {section.modelLab.tag}
          </span>
          <h3 className="mt-1.5 text-sm font-semibold">{section.modelLab.title}</h3>
          {section.modelLab.note && (
            <p className="mt-1 text-xs leading-5 text-stone-600">{section.modelLab.note}</p>
          )}
          <blockquote
            lang="en"
            className="mt-2.5 rounded-lg border-l-4 border-brand-600 bg-[#f7f9f8] px-3.5 py-2.5 text-xs leading-6 text-stone-700"
          >
            {section.modelLab.model}
          </blockquote>
          <p className="mt-2.5 rounded-lg border border-[#e6dcc4] bg-[#fdf9ef] px-3.5 py-2.5 text-xs leading-5 text-[#6f5716]">
            <strong>{section.modelLab.extendTitle}</strong> {section.modelLab.extendText}
          </p>
        </section>
      )}

      {section.detailCards && (
        <div className="grid gap-3 lg:grid-cols-2">
          {section.detailCards.map((card) => (
            <section key={card.tag} className="rounded-xl border border-[#dfe5dd] bg-white p-5">
              <span className="rounded-md bg-[#eaf4ef] px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                {card.tag}
              </span>
              <h3 className="mt-1.5 text-sm font-semibold">{card.title}</h3>
              <p className="mt-1.5 text-xs text-stone-600">{card.flow.join(' → ')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5" lang="en">
                {card.phrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="rounded-md bg-[#f7f9f8] px-2.5 py-1 text-xs text-stone-700"
                  >
                    {phrase}
                  </span>
                ))}
              </div>
              <blockquote
                lang="en"
                className="mt-2.5 rounded-lg border-l-4 border-brand-600 bg-[#f7f9f8] px-3.5 py-2.5 text-xs leading-6 text-stone-700"
              >
                {card.model}
              </blockquote>
              {card.rescueText && (
                <p className="mt-2 text-xs leading-5 text-stone-600">
                  <strong>{card.rescueLabel}</strong>{' '}
                  <span lang="en">{card.rescueText}</span>
                </p>
              )}
            </section>
          ))}
        </div>
      )}

      {section.memoryCodes && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.memoryCodes.title}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {section.memoryCodes.items.map((item) => (
              <div key={item.code} className="rounded-lg border border-[#e8e3d6] p-3.5">
                <strong className="block text-base font-semibold tracking-wide text-brand-800">
                  {item.code}
                </strong>
                <span lang="en" className="block text-[11px] font-semibold text-stone-500">
                  {item.expansion}
                </span>
                <p className="mt-1 text-xs leading-5 text-stone-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.fixes && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.fixes.title}</h3>
          <div className="mt-3 space-y-2">
            {section.fixes.items.map((fix) => (
              <div
                key={fix.avoid}
                className="grid items-center gap-1.5 rounded-lg bg-[#f7f9f8] px-3.5 py-2.5 sm:grid-cols-[1fr_auto_1fr]"
              >
                <span className="text-xs text-[#8a3a3a] line-through decoration-[#d8a8a8]">
                  {fix.avoid}
                </span>
                <span aria-hidden className="hidden text-stone-400 sm:block">→</span>
                <span className="text-xs font-semibold text-brand-800">{fix.prefer}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {section.promptBank && (
        <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
          <h3 className="text-sm font-semibold">{section.promptBank.title}</h3>
          <p className="mt-1 text-xs leading-5 text-stone-600">{section.promptBank.note}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.promptBank.groups.map((group) => (
              <div key={group.title} className="rounded-lg border border-[#e8e3d6] p-3.5">
                <strong className="block text-xs font-semibold">{group.title}</strong>
                <p className="mt-0.5 text-[11px] leading-4 text-stone-600">{group.note}</p>
                <ul className="mt-2 space-y-1" lang="en">
                  {group.questions.map((question) => (
                    <li key={question} className="text-xs leading-5 text-stone-700">
                      · {question}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {section.phraseBank && (
          <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
              Phrase bank
            </span>
            <h3 className="mt-0.5 text-sm font-semibold">{section.phraseBank.title}</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5" lang="en">
              {section.phraseBank.phrases.map((phrase) => (
                <span
                  key={phrase}
                  className="rounded-md bg-[#f7f9f8] px-2.5 py-1.5 text-xs text-stone-700"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </section>
        )}

        {section.checklist && (
          <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
              Checklist
            </span>
            <h3 className="mt-0.5 text-sm font-semibold">{section.checklist.title}</h3>
            <ul className="mt-2.5 space-y-1.5">
              {section.checklist.items.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5 text-stone-700">
                  <span aria-hidden className="text-brand-700">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
