import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { contentUpdateApi, practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { formatDate } from '@/lib/format';
import { useAttemptLabels } from '@/features/practice/attemptLabels';
import { stagger } from '@/lib/motion';

/**
 * Nhật ký cập nhật nội dung: đợt nào thêm đề gì, bấm vào làm ngay.
 *
 * <p>Backend là nơi chặn Premium (trả 403), trang này chỉ hiển thị lại — không
 * tự quyết định quyền, để một chỗ duy nhất giữ luật.
 *
 * <p>Bấm để làm sẽ tạo lượt với ĐÚNG những đề của đợt đó (truyền
 * questionSetIds), không dẫn sang trang Part — ở đó backend tự chọn từ cả ngân
 * hàng nên học viên phải làm lại cả đề cũ.
 */
/** Số đề hiện sẵn ở mỗi đợt; đợt lớn (Ngữ pháp 750 đề) bấm "Xem thêm" mới hiện tiếp. */
const FIRST_PAGE = 12;
const PAGE_STEP = 30;
/** Đợt có quá chừng này đề thì nút làm hàng loạt chỉ mở một nhóm ngẫu nhiên, không mở cả trăm đề. */
const ALL_LIMIT = 40;
const SAMPLE_SIZE = 25;

/** Chọn ngẫu nhiên `count` phần tử, không lặp. */
function pickRandom<T>(items: T[], count: number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, count);
}

export function ContentUpdatePage() {
  const navigate = useNavigate();
  const [startError, setStartError] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<string, number>>({});
  const { skillOfPart } = useAttemptLabels();

  const startAttempt = useMutation({
    mutationFn: (input: { partId: string; questionSetIds: string[] }) =>
      practiceApi.createPartAttempt(input),
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
    onError: (error) =>
      setStartError(
        error instanceof ApiError ? error.message : 'Không mở được đề, thử lại sau',
      ),
  });

  const start = (partId: string | null, questionSetIds: string[]) => {
    if (!partId || questionSetIds.length === 0) return;
    setStartError(null);
    startAttempt.mutate({ partId, questionSetIds });
  };

  const query = useQuery({
    queryKey: ['content-updates'],
    queryFn: contentUpdateApi.list,
    // Nội dung đổi theo đợt biên tập, không cần hỏi lại liên tục.
    staleTime: 5 * 60_000,
    retry: (count, error) =>
      // 403 là do chưa Premium, thử lại cũng vậy.
      !(error instanceof ApiError && error.status === 403) && count < 1,
  });

  if (query.isPending) {
    return <LoadingBlock label="Đang tải nhật ký cập nhật…" />;
  }

  if (query.error instanceof ApiError && query.error.status === 403) {
    return (
      <div className="space-y-5">
        <Breadcrumb />
        <PremiumGate message="Danh sách đề mới thuộc gói Premium. Tài khoản miễn phí làm được 3 đề thi thử đầu của mỗi kỹ năng." />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <ErrorBlock
        message="Không tải được nhật ký cập nhật"
        onRetry={() => void query.refetch()}
      />
    );
  }

  const logs = query.data;

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
      <header className="animate-in">
        <h1 className="page-title">Cập nhật đề</h1>
        <p className="page-description">Đề mới thêm gần đây — bấm vào đề để luyện đúng những đề của đợt đó.</p>
      </header>

      {startError && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{startError}</p>
      )}

      {logs.length === 0 && (
        <p className="rounded-3xl border border-border bg-white p-8 text-center text-sm text-ink-mute">
          Chưa có đợt cập nhật nào.
        </p>
      )}

      {/* Dòng thời gian: mỗi đợt một chấm tròn màu của kỹ năng. */}
      <ol className="relative flex flex-col gap-5 border-l-2 border-ink/80 pl-6 sm:pl-7">
        {logs.map((log, i) => {
          const skill = skillOfPart(log.partId);
          return (
            <li key={log.id} className="relative animate-in" style={stagger(i)}>
              <span
                aria-hidden="true"
                className="absolute -left-[33px] top-6 h-4 w-4 rounded-full border-[3px] bg-white sm:-left-[37px]"
                style={{ borderColor: skill.fg }}
              />
              <section className="rounded-3xl border border-border bg-white p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: skill.bg, color: skill.fg }}>
                    {log.label}
                  </span>
                  <span className="text-xs text-ink-faint">{formatDate(log.logDate)}</span>
                  {log.questionSets.length > 0 && (
                    <span className="ml-auto text-xs font-semibold text-ink-soft">{log.questionSets.length} bộ mới</span>
                  )}
                </div>

                <p className="mt-3 text-[15px] leading-6">{log.description}</p>

                {log.questionSets.length > 0 && (
                  <>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {log.questionSets.slice(0, shown[log.id] ?? FIRST_PAGE).map((set) => (
                        // Mỗi đề mở được riêng: truyền đúng một questionSetId nên
                        // lượt làm bài chỉ có đề này, không kèm đề cũ của Part.
                        <button
                          key={set.questionSetId}
                          type="button"
                          onClick={() => start(log.partId, [set.questionSetId])}
                          disabled={startAttempt.isPending || !log.partId}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface-paper px-3.5 py-2.5 text-left transition-colors hover:border-brand-300 disabled:opacity-60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{set.title}</span>
                            <span className="block font-mono text-[11px] text-ink-faint">{set.code} · {set.itemCount} câu</span>
                          </span>
                          <span aria-hidden="true" className="shrink-0 text-ink-mute">›</span>
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const visibleCount = shown[log.id] ?? FIRST_PAGE;
                      const remaining = log.questionSets.length - visibleCount;
                      return remaining > 0 ? (
                        <button
                          type="button"
                          onClick={() => setShown((prev) => ({ ...prev, [log.id]: visibleCount + PAGE_STEP }))}
                          className="mt-3 block text-xs font-semibold text-ink-mute hover:text-ink"
                        >
                          Xem thêm {Math.min(PAGE_STEP, remaining)} đề (còn {remaining})
                        </button>
                      ) : null;
                    })()}
                    {log.questionSets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const ids = log.questionSets.map((set) => set.questionSetId);
                          start(log.partId, ids.length > ALL_LIMIT ? pickRandom(ids, SAMPLE_SIZE) : ids);
                        }}
                        disabled={startAttempt.isPending || !log.partId}
                        className="mt-3 block text-xs font-semibold text-ink-mute hover:text-ink disabled:opacity-60"
                      >
                        {startAttempt.isPending
                          ? 'Đang mở…'
                          : log.questionSets.length > ALL_LIMIT
                            ? `Làm thử ${SAMPLE_SIZE} đề ngẫu nhiên →`
                            : `Làm cả ${log.questionSets.length} đề →`}
                      </button>
                    )}
                  </>
                )}
              </section>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Breadcrumb() {
  return <h1 className="page-title">Cập nhật đề</h1>;
}
