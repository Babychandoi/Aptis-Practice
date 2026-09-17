import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { teacherBlueprintApi, teacherClassroomApi, teacherContentApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate, formatDateTime } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
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
          Giao đề đã ghép ở tab <strong>Đề thi</strong>.
          {classroom.systemContentEnabled
            ? ' Lớp đã mở kho đề hệ thống.'
            : ' Lớp chưa mở kho đề hệ thống — chỉ ghép được từ đề bạn tự soạn.'}
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
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-slate-900">{assignment.title}</h3>
          {/* Bài giao riêng vài em: đánh dấu để khỏi tưởng cả lớp chưa ai nộp. */}
          {(assignment.recipientUserIds?.length ?? 0) > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-amber-800">
              Giao riêng {assignment.recipientUserIds?.length} em
            </span>
          )}
        </div>
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
          className="ml-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
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
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  // Rỗng = cả lớp. Em nào yếu Writing thì giao riêng, không bắt cả lớp làm.
  const [nguoiNhan, setNguoiNhan] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Giao bài luôn là một bài thi hoàn chỉnh đã ghép sẵn, không giao đề lẻ nữa —
  // đề lẻ không đủ cấu trúc nên học viên làm xong không biết mình đứng ở đâu.
  const blueprints = useQuery({
    queryKey: ['teacher', 'blueprints'],
    queryFn: teacherBlueprintApi.list,
  });

  const students = useQuery({
    queryKey: ['teacher', 'classroom', 'students'],
    queryFn: teacherClassroomApi.students,
  });

  const submit = useMutation({
    mutationFn: () =>
      teacherContentApi.createAssignment({
        title: title.trim(),
        instructions: instructions.trim() || undefined,
        blueprintId: selected ?? undefined,
        recipientUserIds: nguoiNhan.length > 0 ? nguoiNhan : undefined,
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
          Chọn một bài thi đã ghép và đặt hạn nộp cho lớp {classroom.name}.
        </p>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            if (!selected) {
              setError('Chọn một bài thi để giao');
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
              Chọn bài thi
            </span>

            {blueprints.isPending ? (
              <LoadingBlock label="Đang tải bài thi…" />
            ) : !blueprints.data || blueprints.data.length === 0 ? (
              <p className="rounded-xl bg-surface-paper px-3 py-3 text-xs leading-5 text-slate-600">
                Bạn chưa ghép bài thi nào. Soạn đề ở tab <strong>Đề của tôi</strong>, rồi sang
                tab <strong>Đề thi</strong> để ghép thành đề hoàn chỉnh trước khi giao.
              </p>
            ) : (
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
                {blueprints.data.map((bp) => (
                  <label
                    key={bp.id}
                    className={clsx(
                      'flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-2 transition-colors',
                      selected === bp.id
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-transparent hover:bg-surface',
                    )}
                  >
                    <input
                      type="radio"
                      name="blueprint"
                      checked={selected === bp.id}
                      onChange={() => {
                        setSelected(bp.id);
                        // Đỡ giáo viên phải gõ lại tên bài thi.
                        if (!title.trim()) setTitle(bp.name);
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 border-border"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{bp.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        {bp.componentName} ·{' '}
                        {bp.selectionMode === 'FIXED'
                          ? `${bp.questionSetCount} đề cố định`
                          : `hệ thống bốc ${bp.questionSetCount} đề`}
                        {bp.durationSeconds
                          ? ` · ${Math.round(bp.durationSeconds / 60)} phút`
                          : ''}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Giao cho
              </span>
              {nguoiNhan.length > 0 && (
                <button
                  type="button"
                  onClick={() => setNguoiNhan([])}
                  className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  Giao lại cho cả lớp
                </button>
              )}
            </div>

            {students.isPending ? (
              <LoadingBlock label="Đang tải học viên…" />
            ) : !students.data || students.data.length === 0 ? (
              <p className="rounded-xl bg-surface-paper px-3 py-2.5 text-xs text-slate-600">
                Lớp chưa có học viên nào.
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {students.data.map((student) => (
                  <label
                    key={student.userId}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={nguoiNhan.includes(student.userId)}
                      onChange={(event) =>
                        setNguoiNhan((truoc) =>
                          event.target.checked
                            ? [...truoc, student.userId]
                            : truoc.filter((id) => id !== student.userId),
                        )
                      }
                      className="h-4 w-4 shrink-0 rounded border-border"
                    />
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 font-mono text-[10px] font-bold text-white">
                      {student.initial}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-slate-800">
                        {student.fullName || student.email}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {student.attemptsDone} bài đã làm
                        {student.averageScore != null && ` · TB ${student.averageScore.toFixed(1)}`}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <p className="mt-1.5 text-[11px] text-slate-500">
              {nguoiNhan.length === 0
                ? 'Không tick ai = giao cho cả lớp.'
                : `Chỉ ${nguoiNhan.length} em được tick mới thấy bài này.`}
            </p>
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
              {submit.isPending
                ? 'Đang giao…'
                : nguoiNhan.length > 0
                  ? `Giao cho ${nguoiNhan.length} em`
                  : 'Giao cho cả lớp'}
            </button>
          </div>
        </form>
      </div>

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
                      {submission.totalItems != null &&
                        ` · ${submission.answeredItems ?? 0}/${submission.totalItems} câu · đúng ${submission.correctItems ?? 0}`}
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
      <div className="space-y-2.5 rounded-2xl bg-brand-50 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-800">
            Điểm AI
          </span>
          <span className="font-mono text-lg font-bold text-brand-800">
            {submission.aiScore ?? '—'}
          </span>
        </div>

        {/* Chấm mà chỉ thấy mỗi điểm AI thì không biết dựa vào đâu. Hiện luôn em
            làm được bao nhiêu câu, bỏ mấy câu, đúng mấy trong số đã làm. */}
        {submission.totalItems != null && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
            <span className="text-slate-600">
              Làm <strong className="text-slate-900">{submission.answeredItems ?? 0}</strong>/
              {submission.totalItems} câu
            </span>
            {submission.totalItems - (submission.answeredItems ?? 0) > 0 && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">
                bỏ trống {submission.totalItems - (submission.answeredItems ?? 0)}
              </span>
            )}
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
              đúng {submission.correctItems ?? 0}
              {(submission.answeredItems ?? 0) > 0 && `/${submission.answeredItems}`}
            </span>
            {submission.rawScore != null && submission.maxScore != null && (
              <span className="font-mono text-slate-600">
                {submission.rawScore}/{submission.maxScore} điểm
              </span>
            )}
          </div>
        )}

        {/* Route của giáo viên: link cũ trỏ /attempts/... là trang của học viên,
            giáo viên bấm vào bị chặn. */}
        {submission.attemptId && (
          <a
            href={`/giang-day/hoc-vien/${submission.userId}/bai-lam/${submission.attemptId}/chi-tiet`}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
          >
            Xem bài làm từng câu →
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
