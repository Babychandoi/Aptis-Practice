import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { teacherAuthoringApi } from '@/api/endpoints';
import { confirmDialog } from '@/lib/dialog';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { QuestionSetPreviewDialog } from '@/features/classroom/QuestionSetPreviewDialog';
import type { ContributionStatus, TeacherAuthoredSet } from '@/types/api';

const CONTRIBUTION: Record<ContributionStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'bg-amber-50 text-amber-800' },
  ACCEPTED: { label: 'Đã vào kho chung', tone: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Bị từ chối', tone: 'bg-red-50 text-red-700' },
};

/**
 * Đề giáo viên tự soạn.
 *
 * <p>Soạn xong dùng được ngay cho lớp mình, không chờ ai duyệt. Muốn đóng góp
 * vào ngân hàng đề chung thì gửi đề xuất cho quản trị viên.
 */
export function TeacherQuestionSetsTab() {
  const queryClient = useQueryClient();
  const [contributing, setContributing] = useState<TeacherAuthoredSet | null>(null);
  const [previewing, setPreviewing] = useState<TeacherAuthoredSet | null>(null);

  const query = useQuery({
    queryKey: ['teacher', 'question-sets'],
    queryFn: teacherAuthoringApi.list,
  });

  const remove = useMutation({
    mutationFn: teacherAuthoringApi.remove,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'question-sets'] }),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được đề" onRetry={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Đề bạn tự soạn, chỉ lớp bạn thấy. Dùng được ngay sau khi lưu.
        </p>
        <Link
          to="/giang-day/de/moi"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          + Soạn đề mới
        </Link>
      </div>

      {query.data.length === 0 ? (
        <div className="card space-y-2 text-center">
          <p className="text-sm text-slate-600">Bạn chưa soạn đề nào.</p>
          <p className="text-xs leading-5 text-slate-500">
            Soạn đề riêng để giao cho lớp — chọn kỹ năng và part, hệ thống gợi ý sẵn số câu
            theo đúng dạng bài thật.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {query.data.map((set) => {
            const gop = set.contributionStatus ? CONTRIBUTION[set.contributionStatus] : null;
            return (
              <li key={set.id} className="rounded-2xl border border-border bg-white px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{set.title}</h3>
                      {gop && (
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase',
                            gop.tone,
                          )}
                        >
                          {gop.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[set.componentName, set.partName, `${set.itemCount} câu`]
                        .filter(Boolean)
                        .join(' · ')}
                      {' · '}
                      <span className="font-mono">{set.code}</span>
                    </p>
                    {set.contributionStatus === 'REJECTED' && set.contributionNote && (
                      <p className="mt-1.5 rounded-xl bg-red-50 px-3 py-2 text-[11px] leading-5 text-red-700">
                        Quản trị viên từ chối: {set.contributionNote}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">
                      Soạn {formatDate(set.createdAt)}
                    </p>
                  </div>

                  {/* Nút thay vì chữ trơn: bốn chữ xếp cạnh nhau nhìn như một
                      dòng, không biết cái nào bấm được và vùng bấm quá nhỏ.
                      Sửa là việc hay làm nhất nên nổi nhất; Xoá tách sang phải
                      và chỉ đỏ khi rê vào, để không mời bấm nhầm. */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {set.contributionStatus !== 'PENDING'
                      && set.contributionStatus !== 'ACCEPTED' && (
                      <button
                        type="button"
                        onClick={() => setContributing(set)}
                        className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-surface"
                      >
                        Đề xuất
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewing(set)}
                      className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-surface"
                    >
                      Xem
                    </button>
                    <Link
                      to={`/giang-day/de/${set.id}`}
                      className="rounded-lg bg-brand-100 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition-colors hover:bg-brand-200"
                    >
                      Sửa
                    </Link>
                    <button
                      type="button"
                      disabled={remove.isPending}
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: 'Xoá đề?',
                          text: `“${set.title}” sẽ bị xoá. Đề đang nằm trong bài thi ghép thì không xoá được.`,
                          confirmText: 'Xoá đề',
                          danger: true,
                        });
                        if (ok) remove.mutate(set.id);
                      }}
                      className="ml-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {contributing && (
        <ContributeDialog set={contributing} onClose={() => setContributing(null)} />
      )}

      {previewing && (
        <QuestionSetPreviewDialog
          questionSetId={previewing.id}
          title={previewing.title}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}

/** Gửi đề cho quản trị viên xem xét đưa vào ngân hàng chung. */
function ContributeDialog({
  set,
  onClose,
}: {
  set: TeacherAuthoredSet;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => teacherAuthoringApi.contribute(set.id, note.trim() || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'question-sets'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không gửi được'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-base font-bold text-slate-900">Đề xuất vào ngân hàng chung</h2>
        <p className="mt-0.5 text-xs text-slate-500">{set.title}</p>

        <label className="mt-4 block">
          <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Lời nhắn cho quản trị viên
          </span>
          <textarea
            value={note}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: đề này lớp tôi làm thấy sát đề thật"
            className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          />
        </label>

        <p className="mt-2 rounded-xl bg-surface-paper px-3 py-2 text-[11px] leading-5 text-slate-600">
          Nếu được nhận, đề thành đề của hệ thống và mọi học viên đều thấy. Lúc đó bạn không
          sửa được nữa — đề đã là tài sản chung.
        </p>

        {error && (
          <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={send.isPending}
            onClick={() => {
              setError(null);
              send.mutate();
            }}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {send.isPending ? 'Đang gửi…' : 'Gửi đề xuất'}
          </button>
        </div>
      </div>
    </div>
  );
}
