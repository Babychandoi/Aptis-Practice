import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { teacherClassroomApi, type ClassSession } from '@/api/endpoints';
import { confirmDialog } from '@/lib/dialog';
import { formatDateTime } from '@/lib/format';
import { Icon } from '@/components/shell/icons';
import type { Classroom } from '@/types/api';
import { selectedClassroomId, setSelectedClassroomId } from './classroomSelection';

/**
 * Chọn lớp làm việc khi giáo viên dạy nhiều lớp. Chỉ một lớp thì chỉ hiện tên.
 *
 * Đổi lớp là xoá cache mọi truy vấn /teacher: dữ liệu lớp cũ còn trong cache
 * sẽ hiện chớp nhoáng dưới tên lớp mới, dễ khiến giáo viên thao tác nhầm lớp.
 */
export function ClassroomSwitcher({ current }: { current: Classroom }) {
  const queryClient = useQueryClient();
  const all = useQuery({ queryKey: ['teacher-classrooms-all'], queryFn: teacherClassroomApi.all });
  const classes = all.data ?? [];
  if (classes.length <= 1) return <p className="text-[15px] font-bold leading-5">{current.name}</p>;
  return (
    <label className="block">
      <span className="sr-only">Chọn lớp</span>
      <select
        className="w-full rounded-xl border border-border bg-white px-2.5 py-2 text-sm font-bold"
        value={selectedClassroomId() ?? current.id}
        onChange={(e) => {
          setSelectedClassroomId(e.target.value);
          queryClient.removeQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('teacher') && q.queryKey[0] !== 'teacher-classrooms-all' });
          void queryClient.invalidateQueries();
        }}
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}{c.expired ? ' (hết hạn)' : ''}</option>
        ))}
      </select>
    </label>
  );
}

/** Khối "Yêu cầu tham gia" nền vàng ở đầu tab Học viên, như mock. */
export function JoinRequestsPanel() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['teacher', 'classroom', 'join-requests'], queryFn: teacherClassroomApi.joinRequests });
  const decide = useMutation({
    mutationFn: ({ id, ok }: { id: string; ok: boolean }) => (ok ? teacherClassroomApi.approve(id) : teacherClassroomApi.reject(id)),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không xử lý được yêu cầu'),
  });
  const rows = query.data ?? [];
  if (rows.length === 0) return null;

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
      <header className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold">
          Yêu cầu tham gia
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">{rows.length}</span>
        </h2>
        <button
          type="button"
          disabled={decide.isPending}
          onClick={async () => { for (const r of rows) await decide.mutateAsync({ id: r.memberId, ok: true }); }}
          className="text-sm font-semibold hover:underline disabled:opacity-50"
        >
          Duyệt tất cả
        </button>
      </header>
      {error && <p role="alert" className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="divide-y divide-amber-200/70">
        {rows.map((r) => (
          <li key={r.memberId} className="flex flex-wrap items-center gap-3 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sm font-bold">
              {r.fullName.trim().split(' ').pop()?.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{r.fullName}</span>
              <span className="block text-sm text-amber-800">{r.email} · {formatDateTime(r.requestedAt)}</span>
            </span>
            <button type="button" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.memberId, ok: false })} className="btn-secondary min-h-[38px] px-4">
              Từ chối
            </button>
            <button type="button" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.memberId, ok: true })} className="btn-primary min-h-[38px] px-4">
              Duyệt
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Mã tham gia + 4 công tắc + lịch học dạng chữ, như màn Cài đặt lớp của mock. */
export function ClassSwitchesPanel({ classroom }: { classroom: Classroom }) {
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState(classroom.scheduleNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const done = () => {
    setError(null);
    void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom'] });
    void queryClient.invalidateQueries({ queryKey: ['teacher-classrooms-all'] });
  };
  const fail = (err: unknown) => setError(err instanceof ApiError ? err.message : 'Không lưu được');
  const settings = useMutation({ mutationFn: teacherClassroomApi.updateSettings, onSuccess: done, onError: fail });
  const join = useMutation({ mutationFn: teacherClassroomApi.setJoinEnabled, onSuccess: done, onError: fail });
  const code = useMutation({ mutationFn: teacherClassroomApi.regenerateJoinCode, onSuccess: done, onError: fail });

  const switches = [
    { label: 'Cho phép tham gia bằng mã', hint: 'Tắt để khoá lớp, không nhận thêm học viên.', on: classroom.joinEnabled, set: (v: boolean) => join.mutate(v) },
    { label: 'Duyệt trước khi vào lớp', hint: 'Yêu cầu tham gia phải được bạn duyệt.', on: !!classroom.requireApproval, set: (v: boolean) => settings.mutate({ requireApproval: v }) },
    { label: 'Hiện bảng xếp hạng', hint: 'Học viên thấy điểm của bạn cùng lớp.', on: !!classroom.showLeaderboard, set: (v: boolean) => settings.mutate({ showLeaderboard: v }) },
    { label: 'Xem đáp án sau khi nộp', hint: 'Mở đáp án và giải thích sau khi hết hạn.', on: classroom.revealAnswersAfterDue !== false, set: (v: boolean) => settings.mutate({ revealAnswersAfterDue: v }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-white p-5">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">Mã tham gia</h2>
          <p className="text-sm text-ink-mute">Học viên nhập mã để {classroom.requireApproval ? 'gửi yêu cầu vào' : 'vào'} lớp.</p>
        </div>
        <span className="rounded-2xl bg-surface-muted px-4 py-2.5 font-mono text-xl font-bold tracking-[0.2em]">{classroom.joinCode}</span>
        <button
          type="button"
          disabled={code.isPending}
          onClick={async () => {
            const ok = await confirmDialog({ title: 'Tạo mã mới?', text: 'Mã cũ sẽ hết dùng được. Học viên đã ở trong lớp không bị ảnh hưởng.', confirmText: 'Tạo mã mới' });
            if (ok) code.mutate();
          }}
          className="btn-secondary min-h-[40px] px-4"
        >
          Tạo mã mới
        </button>
      </section>

      <section className="rounded-3xl border border-border bg-white px-5">
        {switches.map((s) => (
          <div key={s.label} className="flex items-center gap-4 border-b border-border-subtle py-4 last:border-b-0">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{s.label}</span>
              <span className="block text-sm text-ink-mute">{s.hint}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={s.on}
              aria-label={s.label}
              disabled={settings.isPending || join.isPending}
              onClick={() => s.set(!s.on)}
              className={clsx('relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60', s.on ? 'bg-ink' : 'bg-brand-300')}
            >
              <span className={clsx('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', s.on ? 'left-6' : 'left-1')} />
            </button>
          </div>
        ))}
      </section>

      <form
        className="rounded-3xl border border-border bg-white p-5"
        onSubmit={(e) => { e.preventDefault(); settings.mutate({ scheduleNote: schedule }); }}
      >
        <label htmlFor="class-schedule" className="label">Lịch học</label>
        <div className="flex gap-2">
          <input id="class-schedule" className="input" maxLength={255} value={schedule} placeholder="Tối T3–T5–T7 · 19:30–21:00" onChange={(e) => setSchedule(e.target.value)} />
          <button type="submit" disabled={settings.isPending} className="btn-primary shrink-0">Lưu</button>
        </div>
        <p className="mt-2 text-xs text-ink-faint">Hiện dưới tên lớp. Từng buổi cụ thể tạo ở mục Lịch học.</p>
      </form>
    </div>
  );
}

/** Tab Lịch học: tạo buổi, dán link họp, điểm danh. */
export function ScheduleTab() {
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: ['teacher', 'classroom', 'sessions'], queryFn: teacherClassroomApi.sessions });
  const [editing, setEditing] = useState<ClassSession | 'new' | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<string | null>(null);
  const cancel = useMutation({
    mutationFn: teacherClassroomApi.cancelSession,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'sessions'] }),
  });
  const now = Date.now();
  const list = (sessions.data ?? []).filter((s) => s.status === 'SCHEDULED');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" className="h-4 w-4" /> Thêm buổi học
        </button>
      </div>
      {editing && <SessionForm session={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />}

      {list.length === 0 ? (
        <p className="rounded-3xl border border-border bg-white p-8 text-center text-sm text-ink-mute">
          Chưa có buổi học nào. Thêm buổi để học viên thấy đếm ngược và nút vào lớp online.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-border bg-white">
          {list.map((s) => {
            const start = new Date(s.startsAt);
            const past = new Date(s.endsAt).getTime() < now;
            const today = start.toDateString() === new Date().toDateString();
            return (
              <li key={s.id} className="border-t border-border-subtle first:border-t-0">
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span className={clsx('grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-center leading-tight', today ? 'bg-ink text-white' : 'bg-surface-muted')}>
                    <span className="text-[11px] font-semibold">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][start.getDay()]}</span>
                    <span className="text-lg font-extrabold">{start.getDate()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{s.topic}</span>
                    <span className="block text-sm text-ink-mute">
                      {formatDateTime(s.startsAt)} – {new Date(s.endsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      {s.meetingUrl ? ' · có link online' : ''}
                    </span>
                  </span>
                  <span className={clsx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', today ? 'bg-amber-50 text-amber-700' : past ? 'bg-surface-muted text-ink-soft' : 'bg-skill-reading-bg text-skill-reading')}>
                    {today ? 'Hôm nay' : past ? 'Đã học' : 'Sắp tới'}
                  </span>
                  {s.totalCount > 0 && <span className="text-sm font-semibold tabular-nums">{s.presentCount}/{s.totalCount}</span>}
                  <button type="button" className="btn-secondary min-h-[36px] px-3" onClick={() => setAttendanceFor(attendanceFor === s.id ? null : s.id)}>Điểm danh</button>
                  <button type="button" className="btn-ghost min-h-[36px] px-3" onClick={() => setEditing(s)}>Sửa</button>
                  <button
                    type="button"
                    className="btn-ghost min-h-[36px] px-3 text-red-600"
                    onClick={async () => {
                      const ok = await confirmDialog({ title: 'Huỷ buổi học?', text: 'Học viên sẽ không thấy buổi này nữa.', confirmText: 'Huỷ buổi', danger: true });
                      if (ok) cancel.mutate(s.id);
                    }}
                  >
                    Huỷ
                  </button>
                </div>
                {attendanceFor === s.id && <AttendanceList sessionId={s.id} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SessionForm({ session, onDone }: { session: ClassSession | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const toLocal = (iso?: string) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
  const [topic, setTopic] = useState(session?.topic ?? '');
  const [start, setStart] = useState(toLocal(session?.startsAt));
  const [end, setEnd] = useState(toLocal(session?.endsAt));
  const [url, setUrl] = useState(session?.meetingUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      const body = { topic, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), meetingUrl: url || undefined };
      return session ? teacherClassroomApi.updateSession(session.id, body) : teacherClassroomApi.addSession(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'sessions'] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được buổi học'),
  });
  return (
    <form
      className="grid gap-3 rounded-3xl border border-border bg-white p-5 sm:grid-cols-2"
      onSubmit={(e) => { e.preventDefault(); if (start && end) save.mutate(); }}
    >
      <label className="sm:col-span-2"><span className="label">Chủ đề buổi học</span>
        <input className="input" required maxLength={255} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Speaking Part 3–4: so sánh và thảo luận" /></label>
      <label><span className="label">Bắt đầu</span><input className="input" type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label><span className="label">Kết thúc</span><input className="input" type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <label className="sm:col-span-2"><span className="label">Link lớp online (Meet, Zoom…)</span>
        <input className="input" type="url" maxLength={1000} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/…" /></label>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu buổi học'}</button>
        <button type="button" className="btn-secondary" onClick={onDone}>Đóng</button>
      </div>
    </form>
  );
}

function AttendanceList({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: ['teacher', 'classroom', 'attendance', sessionId], queryFn: () => teacherClassroomApi.attendance(sessionId) });
  const mark = useMutation({
    mutationFn: ({ userId, present }: { userId: string; present: boolean }) => teacherClassroomApi.markAttendance(sessionId, userId, present),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'attendance', sessionId] });
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'sessions'] });
    },
  });
  if (!rows.data) return <p className="px-5 pb-4 text-sm text-ink-mute">Đang tải…</p>;
  if (rows.data.length === 0) return <p className="px-5 pb-4 text-sm text-ink-mute">Lớp chưa có học viên.</p>;
  return (
    <ul className="grid gap-2 bg-surface-paper px-5 py-4 sm:grid-cols-2">
      {rows.data.map((r) => (
        <li key={r.userId} className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3.5 py-2.5">
          <span className="truncate text-sm font-medium">{r.fullName}</span>
          <span className="flex gap-1">
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => mark.mutate({ userId: r.userId, present: v })}
                aria-pressed={r.present === v}
                className={clsx('rounded-full px-3 py-1 text-xs font-semibold', r.present === v ? (v ? 'bg-skill-speaking text-white' : 'bg-red-600 text-white') : 'bg-surface-muted text-ink-soft')}
              >
                {v ? 'Có mặt' : 'Vắng'}
              </button>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
