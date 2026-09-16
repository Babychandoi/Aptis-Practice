import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { teacherContentApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate, formatDateTime } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { QuestionSetPreviewDialog } from '@/features/classroom/QuestionSetPreviewDialog';
import type { Assignment, AssignmentSubmission, Classroom } from '@/types/api';

/** Bài giao và chấm bài. */
export function TeacherAssignmentsTab({ classroom }: { classroom: Classroom }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['teacher', 'classroom', 'assignments'],
    queryFn: teacherContentApi.assignments,
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được bài giao" onRetry={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {classroom.systemContentEnabled
            ? 'Giao đề từ ngân hàng hệ thống hoặc đề bạn tự soạn.'
            : 'Lớp chưa mở kho đề hệ thống — hiện chỉ giao được đề bạn tự soạn.'}
        </p>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          + Giao bài mới
        </button>
      </div>

      {query.data.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">
          Chưa giao bài nào. Bấm “Giao bài mới” để bắt đầu.
        </p>
      ) : (
        <div className="space-y-2.5">
          {query.data.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onGrade={() => setGradingId(assignment.id)}
            />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateAssignmentDialog classroom={classroom} onClose={() => setCreateOpen(false)} />
      )}
      {gradingId && (
        <GradingPanel assignmentId={gradingId} onClose={() => setGradingId(null)} />
      )}
    </div>
  );
}

function AssignmentCard({
  assignment,
  onGrade,
}: {
  assignment: Assignment;
  onGrade: () => void;
}) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => teacherContentApi.deleteAssignment(assignment.id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom'] }),
  });

  return (
    <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3.5">
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900">{assignment.title}</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {assignment.sourceType === 'BLUEPRINT'
            ? 'Đề thi thử full'
            : `${assignment.questionSetCount} đề`}
          {assignment.dueAt && (
            <>
              {' · '}
              <span className={assignment.overdue ? 'font-semibold text-red-600' : ''}>
                Hạn {formatDate(assignment.dueAt)}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-bold text-slate-900">
            {assignment.submittedCount}/{assignment.totalStudents}
          </p>
          <p className="text-[11px] text-slate-500">đã nộp</p>
        </div>

        <span
          className={clsx(
            'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase',
            assignment.status === 'PUBLISHED'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-surface-muted text-slate-600',
          )}
        >
          {assignment.status === 'PUBLISHED' ? 'Đang mở' : 'Đã đóng'}
        </span>

        <button
          type="button"
          onClick={onGrade}
          className="rounded-xl bg-brand-100 px-3.5 py-2 text-xs font-bold text-brand-800 transition-colors hover:bg-brand-200"
        >
          Chấm bài
        </button>

        <button
          type="button"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm(`Xoá bài giao "${assignment.title}"? Bài đã nộp cũng bị xoá.`)) {
              remove.mutate();
            }
          }}
          className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          Xoá
        </button>
      </div>
    </article>
  );
}

function CreateAssignmentDialog({
  classroom,
  onClose,
}: {
  classroom: Classroom;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const queryClient = useQueryClient();
  const [previewing, setPreviewing] = useState<{ id: string; title: string } | null>(null);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ownSets = useQuery({
    queryKey: ['teacher', 'classroom', 'question-sets'],
    queryFn: teacherContentApi.myQuestionSets,
  });

  const submit = useMutation({
    mutationFn: () =>
      teacherContentApi.createAssignment({
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        questionSetIds: selected,
        // Input date cho ngày; quy về cuối ngày để học viên có trọn ngày đó.
        dueAt: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không giao được bài'),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-base font-bold text-slate-900">Giao bài mới</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Chọn đề và đặt hạn nộp cho lớp {classroom.name}.
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (selected.length === 0) {
              setError('Chọn ít nhất một đề để giao');
              return;
            }
            submit.mutate();
          }}
        >
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Tiêu đề bài giao
            </span>
            <input
              value={title}
              required
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ví dụ: Writing Part 2 – Tuần 4"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Lời dặn (không bắt buộc)
            </span>
            <textarea
              value={instructions}
              rows={2}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Ví dụ: Viết tối thiểu 120 từ, nộp trước thứ Sáu."
              className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Hạn nộp (không bắt buộc)
            </span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div>
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Chọn đề ({selected.length} đã chọn)
            </span>

            {ownSets.isPending ? (
              <LoadingBlock label="Đang tải đề…" />
            ) : !ownSets.data || ownSets.data.length === 0 ? (
              <p className="rounded-xl bg-surface-paper px-3 py-3 text-xs leading-5 text-slate-600">
                Bạn chưa soạn đề nào. Vào tab <strong>Đề của tôi</strong> để tạo đề trước, hoặc
                liên hệ quản trị mở kho đề hệ thống cho lớp.
              </p>
            ) : (
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
                {ownSets.data.map((set) => (
                  <label
                    key={set.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(set.id)}
                      onChange={(event) =>
                        setSelected((prev) =>
                          event.target.checked
                            ? [...prev, set.id]
                            : prev.filter((id) => id !== set.id),
                        )
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">
                        {set.title}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {set.componentName} · {set.partName}
                      </span>
                    </span>
                    {/* Tên đề trong cùng một part gần như giống nhau, không xem
                        nội dung thì chọn như chọn mù. */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setPreviewing({ id: set.id, title: set.title });
                      }}
                      className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-surface"
                    >
                      Xem
                    </button>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 hover:bg-surface"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submit.isPending}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {submit.isPending ? 'Đang giao…' : 'Giao cho lớp'}
            </button>
          </div>
        </form>
      </div>

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

/** Panel trượt phải: danh sách bài nộp, chấm tay đè điểm AI. */
function GradingPanel({
  assignmentId,
  onClose,
}: {
  assignmentId: string;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [active, setActive] = useState<AssignmentSubmission | null>(null);

  const query = useQuery({
    queryKey: ['teacher', 'classroom', 'submissions', assignmentId],
    queryFn: () => teacherContentApi.submissions(assignmentId),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-dark/40">
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        className="flex-1 cursor-default bg-transparent"
      />
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            {active ? active.fullName || active.email : 'Bài đã nộp'}
          </h2>
          <button
            type="button"
            onClick={() => (active ? setActive(null) : onClose())}
            className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            {active ? '← Danh sách' : 'Đóng'}
          </button>
        </div>

        {query.isPending ? (
          <LoadingBlock label="Đang tải…" />
        ) : !query.data || query.data.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Chưa có ai nộp bài.</p>
        ) : active ? (
          <GradeForm submission={active} onDone={() => setActive(null)} />
        ) : (
          <div className="space-y-2">
            {query.data.map((submission) => (
              <button
                key={submission.id}
                type="button"
                onClick={() => setActive(submission)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 text-left transition-colors hover:bg-surface"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 font-mono text-[11px] font-bold text-white">
                    {submission.initial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">
                      {submission.fullName || submission.email}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {submission.submittedAt
                        ? formatDateTime(submission.submittedAt)
                        : 'Đang làm'}
                    </span>
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm font-bold text-slate-900">
                    {submission.teacherScore ?? submission.aiScore ?? '—'}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {submission.teacherScore != null ? 'GV chấm' : 'điểm AI'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function GradeForm({
  submission,
  onDone,
}: {
  submission: AssignmentSubmission;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState(
    submission.teacherScore != null ? String(submission.teacherScore) : '',
  );
  const [comment, setComment] = useState(submission.teacherComment ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      teacherContentApi.grade(submission.id, {
        // Để trống = giữ điểm AI, không phải điểm 0.
        teacherScore: score.trim() === '' ? null : Number(score),
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom'] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <div className="rounded-2xl bg-brand-50 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-800">
            Điểm AI
          </span>
          <span className="font-mono text-lg font-bold text-brand-800">
            {submission.aiScore ?? '—'}
          </span>
        </div>
        {submission.attemptId && (
          <a
            href={`/attempts/${submission.attemptId}/result`}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Xem bài làm và nhận xét chi tiết →
          </a>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Điểm giáo viên (ghi đè điểm AI)
        </span>
        <input
          type="number"
          min={0}
          max={10}
          step={0.5}
          value={score}
          onChange={(event) => setScore(event.target.value)}
          placeholder="Để trống = giữ điểm AI"
          className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Nhận xét riêng
        </span>
        <textarea
          value={comment}
          rows={4}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Viết nhận xét cho học viên…"
          className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={save.isPending}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {save.isPending ? 'Đang lưu…' : 'Lưu điểm và nhận xét'}
      </button>
    </form>
  );
}
