import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { studyTipsApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import type { SpeakerCode } from '@/types/api';

/**
 * Bảng mã người nói Listening Part 3.
 *
 * Part 3 hỏi mỗi nhận định thuộc về Nam, Nữ hay Cả hai. Bốn câu của một chủ đề
 * rút lại thành một mã bốn số để học viên nhớ trước khi thi.
 *
 * Mã do backend sinh từ đáp án thật trong ngân hàng, không nhập tay — sửa đề thì
 * mã tự đúng theo.
 */

type Speaker = 'Man' | 'Woman' | 'Both';

const SPEAKER_STYLE: Record<Speaker, { digit: string; label: string; className: string }> = {
  Man: { digit: '1', label: 'Nam nói', className: 'bg-[#e8f0fe] text-[#1a4f8a] border-[#c3d9f5]' },
  Woman: { digit: '2', label: 'Nữ nói', className: 'bg-[#fdeaf3] text-[#8a1a55] border-[#f5c3dc]' },
  Both: { digit: '0', label: 'Cả hai cùng nói', className: 'bg-[#e6f4ee] text-brand-800 border-[#bfe0d2]' },
};

/** Chữ số -> tên người nói, để tô màu ô mã mà không cần tra mảng speakers. */
const SPEAKER_BY_DIGIT: Record<string, Speaker | undefined> = {
  '1': 'Man', '2': 'Woman', '0': 'Both',
};

const VIETNAMESE: Record<Speaker, string> = { Man: 'Nam', Woman: 'Nữ', Both: 'Cả hai' };

export function StudyTipsListeningPart3Page() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  const codes = useQuery({
    queryKey: ['study-tips', 'listening-part-3'],
    queryFn: studyTipsApi.listeningPart3,
    // Mã chỉ đổi khi biên tập sửa đáp án, không cần tải lại liên tục.
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    const all = codes.data ?? [];
    if (!term) return all;
    return all.filter((entry) =>
      entry.title.toLowerCase().includes(term) || entry.code.includes(term));
  }, [codes.data, keyword]);

  if (codes.isLoading) return <LoadingBlock label="Đang tải bảng mã…" />;
  if (codes.error) {
    return <ErrorBlock message="Không tải được bảng mã." onRetry={() => void codes.refetch()} />;
  }

  const total = codes.data?.length ?? 0;

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-xs text-stone-500">
        <Link to="/">Trang chủ</Link><span>›</span>
        <Link to="/meo-hoc">Mẹo học</Link><span>›</span>
        <strong className="text-stone-800">Nghe · Phần 3</strong>
      </nav>

      <header className="rounded-xl bg-brand-900 px-6 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)]">
        <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-md bg-white/10 px-2 py-0.5">Aptis · Nghe</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5">{total} chủ đề</span>
          <span className="rounded-md bg-white/10 px-2 py-0.5">Phần 3</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
          Mã hóa người nói, nhớ đáp án trong vài giây
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#c4e1d8]">
          Mỗi chủ đề có một mã 4 số. Đọc từng số để biết ý đó thuộc về nam, nữ hay cả hai.
        </p>
      </header>

      <section className="rounded-xl border border-[#dfe5dd] bg-white p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
          Quy tắc mã hóa
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {(['Man', 'Woman', 'Both'] as const).map((speaker) => {
            const style = SPEAKER_STYLE[speaker];
            return (
              <div key={speaker} className={clsx('rounded-lg border px-4 py-3', style.className)}>
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  {speaker[0]} · {style.digit}
                </span>
                <strong className="mt-0.5 block text-sm">{speaker}</strong>
                <small className="text-xs opacity-80">{style.label}</small>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg bg-[#fdf6e7] px-4 py-3">
          <p className="text-xs leading-5 text-[#6f5716]">
            <strong>Đừng đảo đáp án theo người mở lời.</strong> Mỗi nhận định phải đối chiếu riêng
            với ý kiến của Nam, Nữ hoặc Cả hai; thứ tự hội thoại không làm đổi đáp án.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-[#dfe5dd] bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee9dc] px-5 py-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-brand-800">
              Bộ mã cần nhớ
            </span>
            <h2 className="text-lg font-semibold">{total} chủ đề Listening Part 3</h2>
          </div>
          <label className="text-xs text-stone-600">
            <span className="sr-only">Tìm chủ đề hoặc mã</span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm chủ đề hoặc mã…"
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
              <TopicRow
                key={entry.questionSetId}
                entry={entry}
                number={index + 1}
                expanded={expandedId === entry.questionSetId}
                onToggle={() => setExpandedId((current) =>
                  current === entry.questionSetId ? null : entry.questionSetId)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TopicRow({
  entry,
  number,
  expanded,
  onToggle,
}: {
  entry: SpeakerCode;
  number: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li className={clsx('px-5 py-3', expanded && 'bg-[#f9fbfa]')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#f5f3ec] text-[10px] font-semibold tabular-nums text-stone-500">
          {number}
        </span>

        <strong className="min-w-0 flex-1 truncate text-sm">
          {entry.title}
          {(entry.hotness ?? 0) >= 4 && (
            <span className="ml-1.5 text-[10px]" title={`Độ hot ${entry.hotness}/5`}>
              {'🔥'.repeat(entry.hotness ?? 0)}
            </span>
          )}
        </strong>

        <CodeChips code={entry.code} />

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="shrink-0 rounded-lg border border-[#ded5c2] px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:border-brand-400"
        >
          {expanded ? 'Thu gọn ▲' : 'Xem mẹo ▼'}
        </button>
      </div>

      {expanded && (
        <div className="mt-2.5 space-y-2 pl-9">
          <p className="rounded-lg bg-[#eaf4ef] px-3 py-2 text-xs leading-5 text-brand-900">
            Theo đúng thứ tự câu hỏi trong Part bank: {entry.code.split('').join(' ')}. Quy ước
            1 = Nam, 2 = Nữ, 0 = Cả hai; không đảo mã theo người bắt đầu hội thoại.
          </p>
          <p className="text-xs text-stone-600">
            {entry.speakers
              .map((speaker) => VIETNAMESE[speaker as Speaker] ?? speaker)
              .join(' · ')}
          </p>
        </div>
      )}
    </li>
  );
}

/** Bốn ô số, tô màu theo người nói để nhìn là nhớ. */
function CodeChips({ code }: { code: string }) {
  return (
    <span className="flex shrink-0 gap-1" aria-label={`Mã ${code}`}>
      {code.split('').map((digit, index) => {
        const speaker = digit ? SPEAKER_BY_DIGIT[digit] : undefined;
        const style = speaker ? SPEAKER_STYLE[speaker] : undefined;
        return (
          <span
            key={index}
            className={clsx(
              'grid h-7 w-7 place-items-center rounded-md border text-xs font-semibold tabular-nums',
              style?.className ?? 'border-stone-200 bg-stone-50 text-stone-500',
            )}
            title={speaker && style ? `${speaker} — ${style.label}` : undefined}
          >
            {digit}
          </span>
        );
      })}
    </span>
  );
}
