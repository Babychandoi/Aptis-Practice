import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { classroomActivityApi, studentWorkspaceApi, type ClassSession } from '@/api/endpoints';
import { formatDate, formatDateTime } from '@/lib/format';
import { Icon } from '@/components/shell/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import type { StudentClassroom } from '@/types/api';

/** Buổi sắp tới gần nhất chưa huỷ và chưa kết thúc. */
function nextSession(sessions: ClassSession[] | undefined, now: number) {
  return (sessions ?? [])
    .filter((s) => s.status === 'SCHEDULED' && new Date(s.endsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}

/**
 * Thẻ đầu trang lớp: tên lớp, giáo viên, đếm ngược buổi tới và nút vào lớp online.
 *
 * Nút chỉ bấm được từ 10 phút trước giờ học: sớm hơn thì phòng họp thường chưa
 * mở, học viên vào rồi lại tưởng link hỏng.
 */
export function ClassHero({ classroom }: { classroom: StudentClassroom }) {
  const sessions = useQuery({
    queryKey: ['classrooms', classroom.classroomId, 'sessions'],
    queryFn: () => classroomActivityApi.sessions(classroom.classroomId),
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const next = nextSession(sessions.data, now);
  const left = next ? Math.max(0, new Date(next.startsAt).getTime() - now) : 0;
  const parts = [Math.floor(left / 3_600_000), Math.floor(left / 60_000) % 60, Math.floor(left / 1000) % 60];
  const open = next && left <= 10 * 60_000 && next.meetingUrl;

  return (
    <section className="relative grid animate-rise gap-6 overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-24 h-72 w-72 rounded-full border border-dashed border-white/10" />
      <div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Lớp học{classroom.scheduleNote ? ` · ${classroom.scheduleNote}` : ''}</span>
        <h1 className="mt-4 text-[clamp(26px,3.4vw,36px)] font-extrabold leading-[1.1] tracking-[-0.035em]">{classroom.name}</h1>
        <p className="mt-3 flex items-center gap-2.5 text-sm">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 font-bold">
            {classroom.teacherName.trim().split(' ').pop()?.charAt(0)}
          </span>
          <span className="font-semibold">{classroom.teacherName}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {next ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Buổi tiếp theo · {next.topic}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {parts.map((v, i) => (
                <span key={i} className="rounded-xl bg-white/10 py-2.5 text-center">
                  <span className="block text-3xl font-extrabold tabular-nums">{String(v).padStart(2, '0')}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">{['Giờ', 'Phút', 'Giây'][i]}</span>
                </span>
              ))}
            </div>
            {open ? (
              <a href={next.meetingUrl!} target="_blank" rel="noreferrer" className="btn mt-3 w-full bg-white text-ink hover:bg-surface-muted">
                <Icon name="video" className="h-4 w-4" /> Vào lớp online
              </a>
            ) : (
              <p className="mt-3 rounded-full bg-white/10 py-2.5 text-center text-sm text-white/70">
                {next.meetingUrl ? 'Lớp mở trước giờ học 10 phút' : `Học lúc ${formatDateTime(next.startsAt)}`}
              </p>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-sm text-white/60">Giáo viên chưa lên lịch buổi học tiếp theo.</p>
        )}
      </div>
    </section>
  );
}

export function ScheduleList({ classroomId }: { classroomId: string }) {
  const query = useQuery({ queryKey: ['classrooms', classroomId, 'sessions'], queryFn: () => classroomActivityApi.sessions(classroomId) });
  if (query.isPending) return <LoadingBlock label="Đang tải lịch…" />;
  const list = (query.data ?? []).filter((s) => s.status === 'SCHEDULED');
  if (list.length === 0) return <p className="card text-center text-sm text-ink-mute">Giáo viên chưa lên lịch buổi học nào.</p>;
  const now = Date.now();
  return (
    <ul className="overflow-hidden rounded-3xl border border-border bg-white">
      {list.map((s) => {
        const start = new Date(s.startsAt);
        const today = start.toDateString() === new Date().toDateString();
        const past = new Date(s.endsAt).getTime() < now;
        return (
          <li key={s.id} className={clsx('flex items-center gap-4 border-t border-border-subtle px-5 py-4 first:border-t-0', today && 'bg-surface-paper')}>
            <span className={clsx('grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-center leading-tight', today ? 'bg-ink text-white' : 'bg-surface-muted')}>
              <span className="text-[11px] font-semibold">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][start.getDay()]}</span>
              <span className="text-lg font-extrabold">{start.getDate()}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{s.topic}</span>
              <span className="block text-sm text-ink-mute">{formatDateTime(s.startsAt)}</span>
            </span>
            <span className={clsx('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', today ? 'bg-amber-50 text-amber-700' : past ? 'bg-surface-muted text-ink-soft' : 'bg-skill-reading-bg text-skill-reading')}>
              {today ? 'Hôm nay' : past ? 'Đã học' : 'Sắp tới'}
            </span>
            {past && s.myAttendance != null && (
              <span className={clsx('text-xs font-semibold', s.myAttendance ? 'text-skill-speaking' : 'text-red-600')}>
                {s.myAttendance ? 'Có mặt' : 'Vắng'}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function MembersList({ classroomId }: { classroomId: string }) {
  const query = useQuery({ queryKey: ['classrooms', classroomId, 'members'], queryFn: () => classroomActivityApi.members(classroomId) });
  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (!query.data) return null;
  const { teacherName, leaderboard, members } = query.data;
  const rows = leaderboard ? [...members].sort((a, b) => (b.score50 ?? -1) - (a.score50 ?? -1)) : members;
  const Person = ({ name, role, you }: { name: string; role: string; you?: boolean }) => (
    <li className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-white p-4 text-center">
      <span className={clsx('grid h-14 w-14 place-items-center rounded-full text-lg font-bold', you ? 'bg-ink text-white' : 'bg-surface-muted')}>
        {name.trim().split(' ').pop()?.charAt(0).toUpperCase()}
      </span>
      <span className="text-sm font-semibold">{name}</span>
      <span className="text-xs text-ink-mute">{role}</span>
    </li>
  );
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Person name={teacherName} role="Giáo viên" />
      {rows.map((m) => (
        <Person
          key={m.userId}
          name={m.fullName}
          you={m.you}
          role={[m.you ? 'Bạn' : null, leaderboard && m.score50 != null ? `${Math.round(m.score50)}/50` : null].filter(Boolean).join(' · ') || 'Học viên'}
        />
      ))}
    </ul>
  );
}

/** Bảng tin lớp: mở bài là tính đã xem, có bình luận. */
export function PostFeed({ classroomId }: { classroomId: string }) {
  const posts = useQuery({ queryKey: ['classrooms', classroomId, 'posts'], queryFn: () => studentWorkspaceApi.posts(classroomId) });
  if (posts.isPending) return <LoadingBlock label="Đang tải…" />;
  if (!posts.data || posts.data.length === 0) return <p className="card text-center text-sm text-ink-mute">Chưa có thông báo nào.</p>;
  return (
    <div className="flex flex-col gap-3">
      {posts.data.map((post) => <PostItem key={post.id} classroomId={classroomId} post={post} />)}
    </div>
  );
}

function PostItem({ classroomId, post }: { classroomId: string; post: { id: string; title: string; content: string | null; pinned: boolean; createdAt: string } }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Hiện trong danh sách là đã đọc: bài ngắn đọc ngay trên thẻ, không phải bấm mở.
  useEffect(() => {
    void classroomActivityApi.markRead(classroomId, post.id).catch(() => undefined);
  }, [classroomId, post.id]);

  const comments = useQuery({
    queryKey: ['classrooms', classroomId, 'posts', post.id, 'comments'],
    queryFn: () => classroomActivityApi.comments(classroomId, post.id),
    enabled: open,
  });
  const add = useMutation({
    mutationFn: () => classroomActivityApi.addComment(classroomId, post.id, draft),
    onSuccess: () => {
      setDraft('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['classrooms', classroomId, 'posts', post.id, 'comments'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không gửi được bình luận'),
  });

  return (
    <article className="rounded-3xl border border-border bg-white p-5">
      <header className="flex items-center gap-2 text-xs text-ink-faint">
        {post.pinned && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">Ghim</span>}
        {formatDate(post.createdAt)}
      </header>
      <h3 className="mt-2 font-bold">{post.title}</h3>
      {post.content && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{post.content}</p>}
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-3 text-xs font-semibold text-ink-mute hover:text-ink" aria-expanded={open}>
        {open ? 'Ẩn bình luận' : 'Bình luận'}
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border-subtle pt-3">
          {(comments.data ?? []).map((c) => (
            <p key={c.id} className="rounded-2xl bg-surface-paper px-3.5 py-2 text-sm">
              <strong>{c.fullName}</strong> <span className="text-xs text-ink-faint">{formatDateTime(c.createdAt)}</span>
              <span className="mt-0.5 block text-ink-soft">{c.body}</span>
            </p>
          ))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) add.mutate(); }}>
            <label htmlFor={`cmt-${post.id}`} className="sr-only">Viết bình luận</label>
            <input id={`cmt-${post.id}`} className="input" maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Viết bình luận…" />
            <button type="submit" className="btn-primary shrink-0" disabled={add.isPending || !draft.trim()}>Gửi</button>
          </form>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </article>
  );
}
