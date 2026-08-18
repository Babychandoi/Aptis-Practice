import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { studyTipsApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { READING_PART_TIPS, type ParaphraseRow, type PartTip } from '@/features/learning/readingPartTips';
import { READING_PART3_TIPS } from '@/features/learning/readingPart3Tips';
import { READING_PART4_TIPS, type TopicTip } from '@/features/learning/readingPart4Tips';
import type { HeadingChain } from '@/types/api';

/**
 * Mẹo học Reading, chia tab theo Part.
 *
 * Part 1 và 2 chỉ có bảng quy tắc chung: Part 1 là câu điền từ rời, Part 2 là sắp
 * xếp câu — bẫy giống nhau ở mọi đề nên không cần bảng riêng.
 *
 * Part 3 và 4 có thêm danh sách chủ đề: chuỗi đáp án do backend sinh từ ngân hàng
 * (luôn đúng), bảng phân tích từng đề thì soạn tay vì bẫy nằm ở nội dung cụ thể.
 */

type TabKey = 'part1' | 'part2' | 'part3' | 'part4';

export function StudyTipsReadingPage() {
  const [tab, setTab] = useState<TabKey>('part4');

  const part3 = useQuery({
    queryKey: ['study-tips', 'reading-part-3'],
    queryFn: studyTipsApi.readingPart3,
    staleTime: 5 * 60_000,
  });
  const part4 = useQuery({
    queryKey: ['study-tips', 'reading-part-4'],
    queryFn: studyTipsApi.readingPart4,
    staleTime: 5 * 60_000,
  });

  const loading = part3.isLoading || part4.isLoading;
  const error = part3.error || part4.error;

  if (loading) return <LoadingBlock label="Đang tải mẹo Reading…" />;
  if (error) {
    return (
      <ErrorBlock
        message="Không tải được mẹo Reading."
        onRetry={() => { void part3.refetch(); void part4.refetch(); }}
      />
    );
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'part1', label: 'Phần 1', count: READING_PART_TIPS[0]?.rows.length ?? 0 },
    { key: 'part2', label: 'Phần 2', count: READING_PART_TIPS[1]?.rows.length ?? 0 },
    { key: 'part3', label: 'Phần 3', count: part3.data?.length ?? 0 },
    { key: 'part4', label: 'Phần 4', count: part4.data?.length ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-xs text-stone-500">
        <Link to="/">Trang chủ</Link><span>›</span>
        <Link to="/meo-hoc">Mẹo học</Link><span>›</span>
        <strong className="text-stone-800">Đọc</strong>
      </nav>

      <header className="rounded-xl bg-brand-900 px-6 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)]">
        <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-md bg-white/10 px-2 py-0.5">Aptis · Đọc</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5">
            {(part3.data?.length ?? 0) + (part4.data?.length ?? 0)} chủ đề
          </span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Mẹo học · Đọc</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#c4e1d8]">
          Chiến lược chống paraphrase cho từng Part — áp dụng ngay vào phòng thi.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Các phần Reading">
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
            className={clsx(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition',
              tab === entry.key
                ? 'border-brand-800 bg-brand-800 text-white'
                : 'border-[#ded5c2] bg-white text-stone-700 hover:border-brand-400',
            )}
          >
            {entry.label}
            <span className={clsx(
              'rounded-full px-1.5 text-[10px] tabular-nums',
              tab === entry.key ? 'bg-white/20' : 'bg-[#f5f3ec] text-stone-500',
            )}>
              {entry.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'part1' && <PartRuleSection tip={READING_PART_TIPS[0]!} />}

      {tab === 'part2' && <PartRuleSection tip={READING_PART_TIPS[1]!} />}

      {tab === 'part3' && (
        <>
          <PartRuleSection tip={READING_PART_TIPS[2]!} />
          <TopicList
            entries={part3.data ?? []}
            heading="chủ đề Reading Part 3"
            subtitle="Mở từng chủ đề để xem chuỗi người nói và bảng chống paraphrase."
            renderDetail={(entry) => (
              <Part3Detail entry={entry} tip={READING_PART3_TIPS[entry.title]} />
            )}
            hasTip={(entry) => Boolean(READING_PART3_TIPS[entry.title])}
          />
        </>
      )}

      {tab === 'part4' && (
        <TopicList
          entries={part4.data ?? []}
          heading="chủ đề Reading Part 4"
          subtitle="Mở từng chủ đề để học chuỗi 7 tiêu đề theo đúng thứ tự đoạn văn."
          renderDetail={(entry) => (
            <Part4Detail entry={entry} tip={READING_PART4_TIPS[entry.title]} />
          )}
          hasTip={(entry) => Boolean(READING_PART4_TIPS[entry.title])}
        />
      )}
    </div>
  );
}

/** Bảng quy tắc chung của một Part — không phụ thuộc đề. */
function PartRuleSection({ tip }: { tip: PartTip }) {
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
          {tip.eyebrow}
        </span>
        <h2 className="mt-0.5 text-lg font-semibold">{tip.title}</h2>
        <p className="mt-1 text-xs leading-5 text-stone-600">{tip.intro}</p>
      </section>

      <section className="rounded-xl border border-[#e6dcc4] bg-[#fdf9ef] p-4">
        <p className="text-xs leading-5 text-[#6f5716]">
          <strong>Quy tắc vàng:</strong> {tip.goldenRule}
        </p>
      </section>

      <ParaphraseTable rows={tip.rows} caption="Từ đề sang dấu hiệu paraphrase trong bài" />

      <div className="grid gap-3 sm:grid-cols-2">
        <StepsCard steps={tip.steps} />
        <ConfusionsCard items={tip.confusions} />
      </div>
    </div>
  );
}

function ParaphraseTable({ rows, caption }: { rows: ParaphraseRow[]; caption: string }) {
  return (
    <section className="rounded-xl border border-[#dfe5dd] bg-white">
      <header className="border-b border-[#eee9dc] px-5 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
          Bảng nhận diện nhanh
        </span>
        <h3 className="text-sm font-semibold">{caption}</h3>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-xs">
          <thead className="bg-brand-800 text-white">
            <tr>
              <th className="px-3 py-2 font-semibold">Vai trò / lõi nghĩa</th>
              <th className="px-3 py-2 font-semibold">Từ khóa ở đề</th>
              <th className="px-3 py-2 font-semibold">Dấu hiệu paraphrase trong bài</th>
              <th className="px-3 py-2 font-semibold">Bẫy cần tránh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1ece0]">
            {rows.map((row, index) => (
              <tr key={row.role} className="align-top">
                <td className="px-3 py-2">
                  <span className="mr-1.5 inline-grid h-4 w-4 place-items-center rounded-full bg-[#eaf4ef] text-[9px] font-semibold text-brand-800">
                    {index + 1}
                  </span>
                  <strong>{row.role}</strong>
                </td>
                <td className="px-3 py-2">
                  <span className="flex flex-wrap gap-1">
                    {row.cues.map((cue) => (
                      <code key={cue} className="rounded bg-[#f5f3ec] px-1.5 py-0.5 text-[10px]">
                        {cue}
                      </code>
                    ))}
                  </span>
                </td>
                <td className="px-3 py-2 leading-5 text-stone-700">{row.signals}</td>
                <td className="px-3 py-2 leading-5 text-stone-500">{row.trap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StepsCard({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-xl border border-[#dfe5dd] bg-white p-4">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-800">
        Quy trình phòng thi
      </span>
      <h3 className="text-sm font-semibold">{steps.length} bước chống paraphrase</h3>
      <ol className="mt-2 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2 text-xs leading-5 text-stone-600">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#f5f3ec] text-[9px] font-semibold">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ConfusionsCard({ items }: { items: string[] }) {
  return (
    <div className="rounded-xl border border-[#e6dcc4] bg-[#fdf9ef] p-4">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8a6b1f]">
        Cần phân biệt
      </span>
      <h3 className="text-sm font-semibold text-[#6f5716]">Những cặp dễ nhầm nhất</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-5 text-[#6f5716]">
            <span aria-hidden="true">⚠</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Danh sách chủ đề dùng chung cho Part 3 và Part 4. */
function TopicList({
  entries,
  heading,
  subtitle,
  renderDetail,
  hasTip,
}: {
  entries: HeadingChain[];
  heading: string;
  subtitle: string;
  renderDetail: (entry: HeadingChain) => React.ReactNode;
  hasTip: (entry: HeadingChain) => boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) =>
      entry.title.toLowerCase().includes(term)
      || entry.headings.some((label) => label.toLowerCase().includes(term)));
  }, [entries, keyword]);

  const detailed = entries.filter(hasTip).length;

  return (
    <section className="rounded-xl border border-[#dfe5dd] bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee9dc] px-5 py-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
            Toàn bộ Part bank
          </span>
          <h2 className="text-lg font-semibold">{entries.length} {heading}</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            {subtitle} {detailed}/{entries.length} chủ đề đã có bảng chi tiết.
          </p>
        </div>
        <label className="text-xs text-stone-600">
          <span className="sr-only">Tìm chủ đề</span>
          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm chủ đề…"
            className="w-56 rounded-lg border border-[#ded5c2] px-3 py-2 text-xs"
          />
        </label>
      </header>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-stone-500">
          Không có chủ đề nào khớp “{keyword}”.
        </p>
      ) : (
        <ul className="divide-y divide-[#f1ece0]">
          {filtered.map((entry, index) => (
            <li
              key={entry.questionSetId}
              className={clsx('px-5 py-3', expandedId === entry.questionSetId && 'bg-[#f9fbfa]')}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#f5f3ec] text-[10px] font-semibold tabular-nums text-stone-500">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">
                    {entry.title}
                    {(entry.hotness ?? 0) >= 4 && (
                      <span className="ml-1.5 text-[10px]" title={`Độ hot ${entry.hotness}/5`}>
                        {'🔥'.repeat(entry.hotness ?? 0)}
                      </span>
                    )}
                    {hasTip(entry) && (
                      <span className="ml-2 rounded-md bg-[#e6f4ee] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-brand-800">
                        Có bảng chi tiết
                      </span>
                    )}
                  </strong>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {entry.headings.map((label, position) => (
                      <span
                        key={position}
                        className="rounded bg-[#f2f6f3] px-1.5 py-0.5 text-[10px] text-stone-600"
                        title={`Câu ${position + 1}`}
                      >
                        {label}
                      </span>
                    ))}
                  </span>
                </div>

                <button
                  type="button"
                  aria-expanded={expandedId === entry.questionSetId}
                  onClick={() => setExpandedId((current) =>
                    current === entry.questionSetId ? null : entry.questionSetId)}
                  className="shrink-0 rounded-lg border border-[#ded5c2] px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:border-brand-400"
                >
                  {expandedId === entry.questionSetId ? 'Thu gọn ▲' : 'Xem mẹo ▼'}
                </button>
              </div>

              {expandedId === entry.questionSetId && renderDetail(entry)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Part3Detail({
  entry,
  tip,
}: {
  entry: HeadingChain;
  tip?: (typeof READING_PART3_TIPS)[string];
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg bg-[#eaf4ef] px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-800">
          Chuỗi đáp án · theo thứ tự nhận định
        </span>
        <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-brand-900">
          {entry.headings.map((label, index) => (
            <span key={index} className="rounded bg-white px-2 py-0.5 font-semibold">
              {index + 1}→{label}
            </span>
          ))}
        </p>
      </div>

      {tip ? (
        <>
          <p className="text-xs leading-5 text-stone-600">{tip.summary}</p>
          <section className="rounded-xl border border-[#e6dcc4] bg-[#fdf9ef] p-3">
            <p className="text-xs leading-5 text-[#6f5716]">
              <strong>Quy tắc vàng:</strong> {tip.goldenRule}
            </p>
          </section>

          <div className="overflow-x-auto rounded-lg border border-[#e6e1d5]">
            <table className="w-full min-w-[46rem] text-left text-xs">
              <thead className="bg-brand-800 text-white">
                <tr>
                  <th className="px-3 py-2 font-semibold">Nhận định</th>
                  <th className="px-3 py-2 font-semibold">Từ khóa ở đề</th>
                  <th className="px-3 py-2 font-semibold">Dấu hiệu trong bài</th>
                  <th className="px-3 py-2 font-semibold">Bẫy cần tránh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1ece0]">
                {tip.hints.map((hint, index) => (
                  <tr key={hint.role} className="align-top">
                    <td className="px-3 py-2">
                      <span className="mr-1.5 inline-grid h-4 w-4 place-items-center rounded-full bg-[#eaf4ef] text-[9px] font-semibold text-brand-800">
                        {index + 1}
                      </span>
                      <strong>{hint.role}</strong>
                    </td>
                    <td className="px-3 py-2">
                      <code className="rounded bg-[#f5f3ec] px-1.5 py-0.5 text-[10px]">
                        {hint.cues}
                      </code>
                    </td>
                    <td className="px-3 py-2 leading-5 text-stone-700">{hint.signals}</td>
                    <td className="px-3 py-2 leading-5 text-stone-500">{hint.trap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StepsCard steps={tip.steps} />
            <ConfusionsCard items={tip.confusions} />
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-[#ded5c2] px-3 py-2.5 text-xs text-stone-500">
          Chủ đề này chưa có bảng chi tiết. Chuỗi đáp án phía trên vẫn dùng để ôn được.
        </p>
      )}
    </div>
  );
}

function Part4Detail({ entry, tip }: { entry: HeadingChain; tip?: TopicTip }) {
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg bg-[#eaf4ef] px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-800">
          Chuỗi ghi nhớ · theo thứ tự đoạn
        </span>
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-brand-900">
          {entry.headings.map((label, index) => (
            <span key={index} className="inline-flex items-center gap-1">
              <span className="rounded bg-white px-1.5 py-0.5 font-medium">
                {tip?.keywordsVi[index] ?? label}
              </span>
              {index < entry.headings.length - 1 && <span aria-hidden="true">→</span>}
            </span>
          ))}
        </p>
      </div>

      {tip ? (
        <>
          <p className="text-xs leading-5 text-stone-600">{tip.summary}</p>

          <div className="overflow-x-auto rounded-lg border border-[#e6e1d5]">
            <table className="w-full min-w-[46rem] text-left text-xs">
              <thead className="bg-brand-800 text-white">
                <tr>
                  <th className="px-3 py-2 font-semibold">Vai trò</th>
                  <th className="px-3 py-2 font-semibold">Tiêu đề ở đề</th>
                  <th className="px-3 py-2 font-semibold">Dấu hiệu trong đoạn</th>
                  <th className="px-3 py-2 font-semibold">Bẫy cần tránh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1ece0]">
                {tip.hints.map((hint, index) => (
                  <tr key={hint.heading} className="align-top">
                    <td className="px-3 py-2">
                      <span className="mr-1.5 inline-grid h-4 w-4 place-items-center rounded-full bg-[#eaf4ef] text-[9px] font-semibold text-brand-800">
                        {index + 1}
                      </span>
                      <strong>{hint.role}</strong>
                    </td>
                    <td className="px-3 py-2">
                      <code className="rounded bg-[#f5f3ec] px-1.5 py-0.5 text-[11px]">
                        {hint.heading}
                      </code>
                    </td>
                    <td className="px-3 py-2 leading-5 text-stone-700">{hint.signals}</td>
                    <td className="px-3 py-2 leading-5 text-stone-500">{hint.trap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StepsCard steps={tip.steps} />
            <ConfusionsCard items={tip.confusions} />
          </div>

          <div className="rounded-lg border border-[#dfe5dd] bg-[#f9fbfa] p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-800">
              Câu chuyện liên tưởng
            </span>
            <p className="mt-1 text-xs leading-5 text-stone-700">{tip.story}</p>
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-[#ded5c2] px-3 py-2.5 text-xs text-stone-500">
          Chủ đề này chưa có bảng phân tích paraphrase. Chuỗi tiêu đề phía trên vẫn dùng để ôn được.
        </p>
      )}
    </div>
  );
}
