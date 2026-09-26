import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { toolsApi, type SpeakingMerge } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useAuthStore } from '@/features/auth/authStore';
import { Icon } from '@/components/shell/icons';
import {
  PART3_FRAMES,
  PART3_RHYTHM,
  PART4_FORMAL,
  PART4_INFORMAL,
  PART4_REGISTER,
  PART4_SITUATIONS,
  type Frame,
} from './writingFrames';

type Tab = 'merge' | 'part3' | 'part4';

/**
 * Trang Công cụ: gộp đề Speaking Part 4 bằng AI và khung trả lời Writing.
 *
 * Mock có trang này nhưng không có lối vào; sidebar giờ có mục "Công cụ".
 */
export function ToolsPage() {
  const [tab, setTab] = useState<Tab>('merge');
  const tabs: { key: Tab; label: string; tag: string; color: string; bg: string }[] = [
    { key: 'merge', label: 'Gộp đề Speaking Part 4', tag: 'Speaking · AI', color: '#15803D', bg: '#ECFDF3' },
    { key: 'part3', label: 'Khung trả lời Writing Part 3', tag: 'Writing', color: '#BE185D', bg: '#FDF2F8' },
    { key: 'part4', label: 'Bộ email mẫu Part 4', tag: 'Writing', color: '#BE185D', bg: '#FDF2F8' },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header className="animate-rise">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Công cụ</p>
        <h1 className="mt-2 max-w-[20ch] text-[clamp(32px,4.6vw,52px)] font-extrabold leading-[1.06] tracking-[-0.04em]">
          Gộp đề, khung trả lời, mẫu email — dùng được ngay
        </h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={clsx(
              'flex flex-col gap-2 rounded-3xl border bg-white p-5 text-left transition-colors',
              tab === t.key ? 'border-ink' : 'border-border hover:border-brand-300',
            )}
          >
            <span className="self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: t.bg, color: t.color }}>{t.tag}</span>
            <span className="text-lg font-bold leading-6 tracking-tight">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'merge' && <SpeakingMergeTool />}
      {tab === 'part3' && <Part3Frames />}
      {tab === 'part4' && <Part4Frames />}

      <Link to="/du-doan-de" className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-white p-5 hover:border-brand-300">
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">4 kỹ năng</span>
          <span className="mt-1 block text-lg font-bold">Dự đoán đề</span>
          <span className="mt-1 block text-sm text-ink-mute">Chủ đề được học viên báo cáo nhiều nhất sau mỗi kỳ thi.</span>
        </span>
        <Icon name="arrow" />
      </Link>
    </div>
  );
}

function SpeakingMergeTool() {
  const queryClient = useQueryClient();
  const premium = useAuthStore((s) => s.user?.premiumActive === true);
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [shown, setShown] = useState<SpeakingMerge | null>(null);

  const overviewQuery = useQuery({ queryKey: ['tools-speaking-merge'], queryFn: toolsApi.speakingMerge });
  const merge = useMutation({
    mutationFn: () => toolsApi.mergeSpeaking(picked),
    onSuccess: (data) => {
      setShown(data);
      void queryClient.invalidateQueries({ queryKey: ['tools-speaking-merge'] });
    },
  });

  const sets = overviewQuery.data?.sets ?? [];
  const setById = useMemo(() => new Map(sets.map((s) => [s.id, s])), [sets]);
  const filtered = sets.filter((s) =>
    !search.trim() || `${s.title} ${s.questions.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const quota = overviewQuery.data?.quota;
  const errorText = merge.error instanceof ApiError ? merge.error.message : merge.error ? 'Không gộp được, hãy thử lại' : null;

  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]));

  return (
    <section className="grid gap-6 rounded-3xl border border-border bg-white p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <span className="rounded-full bg-skill-speaking-bg px-2.5 py-0.5 text-[11px] font-semibold text-skill-speaking">Speaking Part 4</span>
          <h2 className="mt-3 text-[22px] font-bold tracking-tight">Gộp đề Speaking Part 4</h2>
          <p className="mt-2 text-sm leading-6 text-ink-mute">
            Chọn 2–3 đề, AI tìm ý chung để bạn chuẩn bị một câu trả lời dùng cho cả nhóm.
          </p>
        </div>

        <label htmlFor="merge-search" className="sr-only">Tìm đề</label>
        <input
          id="merge-search"
          className="input"
          placeholder={`Tìm trong ${sets.length} đề Part 4…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
          {overviewQuery.isLoading && <li className="text-sm text-ink-mute">Đang tải đề…</li>}
          {filtered.map((set) => {
            const on = picked.includes(set.id);
            const full = !on && picked.length >= 3;
            return (
              <li key={set.id}>
                <button
                  type="button"
                  onClick={() => toggle(set.id)}
                  disabled={full}
                  aria-pressed={on}
                  className={clsx(
                    'flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors disabled:opacity-40',
                    on ? 'border-skill-speaking bg-skill-speaking-bg' : 'border-border hover:border-brand-300',
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border',
                      on ? 'border-skill-speaking bg-skill-speaking text-white' : 'border-brand-300',
                    )}
                  >
                    {on && <Icon name="check" className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{set.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-ink-mute">{set.questions.filter((q) => q !== set.title).join(' · ')}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3">
          {premium ? (
            <button
              type="button"
              className="btn-primary"
              disabled={picked.length < 2 || merge.isPending || (quota?.remaining ?? 0) <= 0}
              onClick={() => merge.mutate()}
            >
              {merge.isPending ? 'AI đang gộp… (20–40 giây)' : `Gộp ${picked.length || ''} đề`.replace('  ', ' ')}
            </button>
          ) : (
            <Link to="/plans" className="btn-primary">
              <Icon name="lock" className="h-4 w-4" /> Mở khoá bằng Premium
            </Link>
          )}
          {quota && premium && (
            <span className="text-xs text-ink-mute">Còn {quota.remaining}/{quota.limit} lượt hôm nay</span>
          )}
        </div>
        {errorText && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errorText}</p>}
      </div>

      <div className="min-w-0 rounded-2xl bg-surface-paper p-5 sm:p-6">
        {shown ? (
          <MergeResultView merge={shown} titleOf={(id) => setById.get(id)?.title ?? id} />
        ) : (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-ink-faint">Chọn ít nhất 2 đề rồi bấm Gộp</p>
            {(overviewQuery.data?.history.length ?? 0) > 0 && (
              <div className="w-full max-w-sm text-left">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Đã gộp trước đây</p>
                <ul className="flex flex-col gap-1.5">
                  {overviewQuery.data!.history.slice(0, 6).map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => { setShown(h); setPicked(h.questionSetIds); }}
                        className="w-full truncate rounded-xl border border-border bg-white px-3 py-2 text-left text-sm hover:border-brand-300"
                      >
                        {h.questionSetIds.map((id) => setById.get(id)?.title ?? 'Đề đã gỡ').join(' + ')}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function MergeResultView({ merge, titleOf }: { merge: SpeakingMerge; titleOf: (id: string) => string }) {
  const r = merge.result;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.modelAnswer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* trình duyệt chặn clipboard: học viên tự bôi đen chép */
    }
  };
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Ý chung</p>
        <p className="mt-1.5 text-base font-bold leading-6">{r.commonIdea}</p>
        {r.why && <p className="mt-1.5 text-sm leading-6 text-ink-mute">{r.why}</p>}
      </div>

      {r.outline && r.outline.length > 0 && (
        <ol className="flex flex-col gap-1.5 text-sm text-ink-soft">
          {r.outline.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-2xl border border-border bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Bài trả lời mẫu · ~2 phút</p>
          <button type="button" onClick={copy} className="text-xs font-semibold text-ink-mute hover:text-ink">
            {copied ? 'Đã chép ✓' : 'Chép'}
          </button>
        </div>
        <p className="whitespace-pre-line text-[15px] leading-7">{r.modelAnswer}</p>
      </div>

      {r.adaptations && r.adaptations.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Đổi cho từng đề</p>
          {r.adaptations.map((a, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-4">
              <p className="text-sm font-semibold">{a.topicId ? titleOf(a.topicId) : a.topic}</p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm leading-6 text-ink-soft">
                {(a.changes ?? []).map((c, j) => <li key={j}>{c}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {r.usefulPhrases && r.usefulPhrases.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Cụm từ nên dùng</p>
          <div className="flex flex-wrap gap-2">
            {r.usefulPhrases.map((p, i) => (
              <span key={i} className="rounded-full border border-border bg-white px-3 py-1 text-xs">{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Part3Frames() {
  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-3xl border border-border bg-white p-5 sm:p-7">
        <h2 className="text-[22px] font-bold tracking-tight">Khung trả lời Writing Part 3</h2>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-ink-mute">
          Mỗi đề có 3 câu hỏi từ 3 thành viên câu lạc bộ, trả lời 30–40 từ mỗi câu. Mọi câu hỏi trong ngân hàng đề đều thuộc một trong ba dạng dưới đây.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-4">
          {PART3_RHYTHM.map((step, i) => (
            <li key={step} className="rounded-2xl bg-surface-paper p-4">
              <span className="text-xs font-bold text-skill-writing">Câu {i + 1}</span>
              <p className="mt-1 text-sm leading-6">{step}</p>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PART3_FRAMES.map((f) => <FrameCard key={f.id} frame={f} />)}
      </div>
    </section>
  );
}

function Part4Frames() {
  return (
    <section className="flex flex-col gap-5">
      <div className="grid gap-5 rounded-3xl border border-border bg-white p-5 sm:p-7 lg:grid-cols-2">
        <div>
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">~50 từ</span>
          <h2 className="mt-3 text-lg font-bold">Email thân mật (gửi bạn)</h2>
          <FrameLines lines={PART4_INFORMAL} />
        </div>
        <div>
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-white">120–150 từ</span>
          <h2 className="mt-3 text-lg font-bold">Email trang trọng (gửi quản lý)</h2>
          <FrameLines lines={PART4_FORMAL} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-surface-paper text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              <th className="px-5 py-3">Văn phong</th><th className="px-5 py-3">Thân mật</th><th className="px-5 py-3">Trang trọng</th>
            </tr>
          </thead>
          <tbody>
            {PART4_REGISTER.map(([k, a, b]) => (
              <tr key={k} className="border-t border-border-subtle">
                <td className="px-5 py-3 font-semibold">{k}</td><td className="px-5 py-3 text-ink-soft">{a}</td><td className="px-5 py-3 text-ink-soft">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-bold">Thân email theo 5 dạng tình huống</h2>
        <p className="mt-1 text-sm text-ink-mute">Nhận ra dạng tình huống trước, rồi thay đoạn thân email trang trọng bằng khung tương ứng.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {PART4_SITUATIONS.map((f) => <FrameCard key={f.id} frame={f} />)}
      </div>
    </section>
  );
}

function FrameCard({ frame }: { frame: Frame }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-border bg-white p-5">
      <h3 className="text-base font-bold">{frame.name}</h3>
      <div className="flex flex-wrap gap-1.5">
        {frame.signals.map((s) => (
          <span key={s} className="rounded-full bg-skill-writing-bg px-2 py-0.5 text-[11px] font-medium text-skill-writing">{s}</span>
        ))}
      </div>
      <FrameLines lines={frame.frame} />
      <button type="button" onClick={() => setOpen((v) => !v)} className="self-start text-xs font-semibold text-ink-mute hover:text-ink" aria-expanded={open}>
        {open ? 'Ẩn bài mẫu' : 'Xem bài mẫu từ đề thật'}
      </button>
      {open && (
        <div className="rounded-2xl bg-surface-paper p-4 text-sm leading-6">
          <p className="text-xs font-semibold text-ink-mute">{frame.example.prompt}</p>
          <p className="mt-2">{frame.example.answer}</p>
        </div>
      )}
    </article>
  );
}

/** Tô nổi phần [ ] để học viên thấy ngay chỗ phải thay. */
function FrameLines({ lines }: { lines: readonly string[] }) {
  return (
    <ol className="mt-3 flex flex-col gap-2 text-sm leading-6">
      {lines.map((line, i) => (
        <li key={i} className="rounded-xl bg-surface-paper px-3 py-2">
          {line.split(/(\[[^\]]+\])/).map((part, j) =>
            part.startsWith('[') ? (
              <mark key={j} className="rounded bg-amber-100 px-1 text-amber-900">{part.slice(1, -1)}</mark>
            ) : (
              <span key={j}>{part}</span>
            ),
          )}
        </li>
      ))}
    </ol>
  );
}
