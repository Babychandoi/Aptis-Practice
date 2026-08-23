import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { contentUpdateApi, practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { formatDate } from '@/lib/format';

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
export function ContentUpdatePage() {
  const navigate = useNavigate();
  const [startError, setStartError] = useState<string | null>(null);

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
    <div className="space-y-5">
      <Breadcrumb />

      <header className="rounded-xl bg-brand-900 px-5 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)] sm:px-7">
        <p className="text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-md bg-white/10 px-2 py-0.5">
            {logs.length} đợt cập nhật
          </span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Cập nhật đề</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#c4e1d8]">
          Đề mới thêm gần đây — bấm vào để luyện ngay.
        </p>
      </header>

      {startError && (
        <p role="alert" className="card text-sm text-red-700">{startError}</p>
      )}

      {logs.length === 0 && (
        <p className="card text-center text-sm text-slate-500">
          Chưa có đợt cập nhật nào.
        </p>
      )}

      <div className="space-y-4">
        {logs.map((log) => (
          <section
            key={log.id}
            className="rounded-xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-brand-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-700">
                {log.label}
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {formatDate(log.logDate)}
              </span>
            </div>

            <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
              {log.description}
            </p>

            {log.questionSets.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {log.questionSets.length} đề mới
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      start(
                        log.partId,
                        log.questionSets.map((set) => set.questionSetId),
                      )
                    }
                    disabled={startAttempt.isPending || !log.partId}
                    className="btn-primary min-h-[36px] px-3.5 text-xs disabled:opacity-60"
                  >
                    {startAttempt.isPending
                      ? 'Đang mở…'
                      : `Làm cả ${log.questionSets.length} đề →`}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {log.questionSets.map((set) => (
                    // Mỗi đề mở được riêng: truyền đúng một questionSetId nên
                    // lượt làm bài chỉ có đề này, không kèm đề cũ của Part.
                    <button
                      key={set.questionSetId}
                      type="button"
                      onClick={() => start(log.partId, [set.questionSetId])}
                      disabled={startAttempt.isPending || !log.partId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-paper px-3.5 py-2.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-900">
                          {set.title}
                        </span>
                        <span className="block font-mono text-[10px] text-slate-500">
                          {set.code} · {set.itemCount} câu
                        </span>
                      </span>
                      <span aria-hidden className="shrink-0 text-brand-700">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Breadcrumb() {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
      <Link to="/" className="hover:text-brand-800">Trang chủ</Link>
      <span aria-hidden="true">›</span>
      <span className="font-semibold text-stone-800">Cập nhật đề</span>
    </nav>
  );
}
