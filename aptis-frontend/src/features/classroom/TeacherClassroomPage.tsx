import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { teacherClassroomApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { TeacherAssignmentsTab } from '@/features/classroom/TeacherAssignmentsTab';
import { TeacherContentTab } from '@/features/classroom/TeacherContentTab';
import { TeacherPostsTab } from '@/features/classroom/TeacherPostsTab';
import { TeacherPredictionsTab } from '@/features/classroom/TeacherPredictionsTab';
import { ClassroomSidebar } from '@/features/classroom/ClassroomSidebar';
import { TeacherQuestionSetsTab } from '@/features/classroom/TeacherQuestionSetsTab';
import { TeacherBlueprintsTab } from '@/features/classroom/TeacherBlueprintsTab';
import type { Classroom } from '@/types/api';

type Tab =
  | 'students'
  | 'assignments'
  | 'my-sets'
  | 'blueprints'
  | 'materials'
  | 'posts'
  | 'predictions'
  | 'progress'
  | 'settings';

/** Ngưỡng màu cho thanh tiến độ — khớp wireframe. */
function scoreTone(score: number): string {
  if (score >= 70) return 'bg-emerald-600';
  if (score >= 55) return 'bg-amber-600';
  return 'bg-red-600';
}

function scoreText(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 55) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Lớp học nhìn từ phía giáo viên.
 *
 * <p>Mỗi giáo viên đúng một lớp nên không có màn danh sách — vào thẳng lớp của
 * mình.
 */
export function TeacherClassroomPage() {
  const [tab, setTab] = useState<Tab>('students');
  const [inviteOpen, setInviteOpen] = useState(false);

  const query = useQuery({
    queryKey: ['teacher', 'classroom'],
    queryFn: teacherClassroomApi.myClassroom,
  });

  if (query.isPending) {
    return <LoadingBlock label="Đang tải lớp học…" />;
  }

  if (query.error instanceof ApiError && query.error.status === 404) {
    return (
      <div className="space-y-5">
        <Breadcrumb />
        <p className="card text-center text-sm text-slate-500">
          Tài khoản của bạn chưa được gắn lớp học. Liên hệ quản trị viên để được cấp lớp.
        </p>
      </div>
    );
  }

  if (query.error || !query.data) {
    return <ErrorBlock message="Không tải được lớp học" onRetry={() => void query.refetch()} />;
  }

  const classroom = query.data;

  return (
    <div className="space-y-5">
      <Breadcrumb />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{classroom.name}</h1>
            <PricingBadge classroom={classroom} />
            <SystemContentBadge enabled={classroom.systemContentEnabled} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {classroom.studentCount}/{classroom.maxStudents} học viên · Mã lớp{' '}
            <span className="font-mono font-semibold text-slate-700">{classroom.joinCode}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          Mời vào lớp
        </button>
      </header>

      <ClassroomSidebar
          title={classroom.name}
          subtitle={`${classroom.studentCount}/${classroom.maxStudents} học viên · Mã ${classroom.joinCode}`}
          backTo="/"
          backLabel="Rời lớp"
          value={tab}
          onChange={setTab}
          items={[
            { key: 'students', label: 'Học viên', badge: classroom.studentCount },
            { key: 'assignments', label: 'Bài giao' },
            { key: 'my-sets', label: 'Đề của tôi' },
            { key: 'blueprints', label: 'Bài thi ghép' },
            { key: 'materials', label: 'Tài liệu' },
            { key: 'posts', label: 'Bảng tin lớp' },
            { key: 'predictions', label: 'Dự đoán đề' },
            { key: 'progress', label: 'Tiến độ' },
            { key: 'settings', label: 'Cài đặt lớp' },
          ]}
      />

      <div className="space-y-4">
        {tab === 'students' && <StudentTable />}
        {tab === 'assignments' && <TeacherAssignmentsTab classroom={classroom} />}
        {tab === 'my-sets' && <TeacherQuestionSetsTab />}
        {tab === 'blueprints' && <TeacherBlueprintsTab classroom={classroom} />}
        {tab === 'materials' && <TeacherContentTab kind="materials" />}
        {tab === 'posts' && <TeacherPostsTab />}
        {tab === 'predictions' && <TeacherPredictionsTab classroom={classroom} />}
        {tab === 'progress' && <ProgressPanel studentCount={classroom.studentCount} />}
        {tab === 'settings' && <SettingsPanel classroom={classroom} />}
      </div>

      {inviteOpen && <InviteDialog classroom={classroom} onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

function StudentTable() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['teacher', 'classroom', 'students'],
    queryFn: teacherClassroomApi.students,
  });

  const remove = useMutation({
    mutationFn: teacherClassroomApi.removeStudent,
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom'] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không gỡ được học viên'),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được danh sách" onRetry={() => void query.refetch()} />;
  }
  if (query.data.length === 0) {
    return (
      <p className="card text-center text-sm text-slate-500">
        Chưa có học viên nào. Bấm “Mời vào lớp” để lấy mã và QR gửi cho học viên.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Điện thoại: bảng 5 cột phải cuộn ngang mới thấy điểm và nút Gỡ, mà
          không có gì báo là còn cột bên phải. Dạng thẻ hiện đủ mọi thông tin
          trong một màn. Từ md trở lên vẫn dùng bảng cho dễ so sánh giữa các em. */}
      <ul className="space-y-2 md:hidden">
        {query.data.map((student) => (
          <li
            key={student.userId}
            className="rounded-2xl border border-border bg-white px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 font-mono text-[11px] font-bold text-white">
                  {student.initial}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">
                    {student.fullName || 'Học viên'}
                  </span>
                  <span className="block truncate font-mono text-[11px] text-slate-500">
                    {student.email}
                  </span>
                </span>
              </div>
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(`Gỡ ${student.fullName || student.email} khỏi lớp?`)) {
                    remove.mutate(student.userId);
                  }
                }}
                className="shrink-0 text-xs font-semibold text-red-600 transition-colors hover:text-red-700 disabled:opacity-50"
              >
                Gỡ
              </button>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border-subtle pt-2.5">
              <div>
                <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Bài đã làm
                </dt>
                <dd className="mt-0.5 text-sm text-slate-700">{student.attemptsDone}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Điểm TB
                </dt>
                <dd className="mt-0.5 text-sm font-bold text-slate-900">
                  {student.averageScore != null ? student.averageScore.toFixed(1) : '—'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Gần nhất
                </dt>
                <dd className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  {student.lastActiveAt ? formatDateTime(student.lastActiveAt) : 'Chưa làm bài'}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-white md:block">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="bg-surface-paper">
              {['Học viên', 'Bài đã làm', 'Điểm TB', 'Hoạt động gần nhất', ''].map((header) => (
                <th
                  key={header}
                  className="px-4 py-2.5 text-left font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.data.map((student) => (
              <tr key={student.userId} className="border-t border-border-subtle">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 font-mono text-[11px] font-bold text-white">
                      {student.initial}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">
                        {student.fullName || 'Học viên'}
                      </span>
                      <span className="block font-mono text-[11px] text-slate-500">
                        {student.email}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{student.attemptsDone}</td>
                <td className="px-4 py-3 font-bold text-slate-900">
                  {student.averageScore != null ? student.averageScore.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-500">
                  {student.lastActiveAt ? formatDateTime(student.lastActiveAt) : 'Chưa làm bài'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Gỡ ${student.fullName || student.email} khỏi lớp?`)) {
                        remove.mutate(student.userId);
                      }
                    }}
                    className="text-xs font-semibold text-red-600 transition-colors hover:text-red-700 disabled:opacity-50"
                  >
                    Gỡ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProgressPanel({ studentCount }: { studentCount: number }) {
  const query = useQuery({
    queryKey: ['teacher', 'classroom', 'progress'],
    queryFn: teacherClassroomApi.progress,
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được tiến độ" onRetry={() => void query.refetch()} />;
  }
  if (query.data.length === 0) {
    return (
      <p className="card text-center text-sm text-slate-500">
        Chưa đủ dữ liệu. Số liệu xuất hiện khi học viên bắt đầu làm bài.
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-white px-6 py-5">
      <h2 className="text-sm font-bold text-slate-900">Điểm mạnh / yếu theo kỹ năng</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Trung bình của {studentCount} học viên trong lớp
      </p>

      <div className="mt-5 space-y-4">
        {query.data.map((row) => (
          <div key={row.componentCode}>
            <div className="mb-1.5 flex justify-between text-xs font-semibold">
              <span className="text-slate-700">{row.componentName}</span>
              <span className={scoreText(row.score)}>{row.score}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={clsx('h-full rounded-full transition-all', scoreTone(row.score))}
                style={{ width: `${Math.max(2, Math.min(100, row.score))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel({ classroom }: { classroom: Classroom }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(classroom.name);
  const [description, setDescription] = useState(classroom.description ?? '');
  const [pricingType, setPricingType] = useState(classroom.pricingType);
  const [price, setPrice] = useState(String(classroom.priceAmount));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    setSaved(true);
    setError(null);
    window.setTimeout(() => setSaved(false), 2500);
    void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom'] });
  };

  const saveProfile = useMutation({
    mutationFn: () =>
      teacherClassroomApi.update({ name: name.trim(), description: description.trim() }),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  const savePricing = useMutation({
    mutationFn: () =>
      teacherClassroomApi.updatePricing({
        pricingType,
        priceAmount: pricingType === 'PAID' ? Number(price) || 0 : 0,
      }),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  const toggleJoin = useMutation({
    mutationFn: (enabled: boolean) => teacherClassroomApi.setJoinEnabled(enabled),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  return (
    <div className="max-w-xl space-y-4">
      <form
        className="space-y-3 rounded-2xl border border-border bg-white px-5 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          saveProfile.mutate();
        }}
      >
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Thông tin lớp
        </h2>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Tên lớp</span>
          <input
            value={name}
            required
            maxLength={255}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ví dụ: Aptis Cấp tốc T9 – Sáng thứ 7"
            className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">
            Mô tả (không bắt buộc)
          </span>
          <textarea
            value={description}
            rows={2}
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Lịch học, yêu cầu, ghi chú cho học viên…"
            className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
          />
        </label>

        <button
          type="submit"
          disabled={saveProfile.isPending}
          className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
        >
          {saveProfile.isPending ? 'Đang lưu…' : 'Lưu thông tin lớp'}
        </button>
      </form>

      <section className="space-y-4 rounded-2xl border border-border bg-white px-5 py-5">
        <div>
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Học phí lớp học
          </h2>
          <div className="mt-2 flex gap-2">
            {(
              [
                ['FREE', 'Miễn phí'],
                ['PAID', 'Có phí'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPricingType(value)}
                className={clsx(
                  'rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                  pricingType === value
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-muted text-slate-600 hover:bg-surface',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {pricingType === 'PAID' && (
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Giá (VND)
            </span>
            <input
              type="number"
              min={0}
              step={10000}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Ví dụ: 300000"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            <span className="mt-1.5 block text-[11px] leading-4 text-slate-500">
              Học viên trả khoản này khi tham gia lớp — tách với gói giáo viên bạn trả cho nền tảng.
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={savePricing.isPending}
            onClick={() => savePricing.mutate()}
            className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {savePricing.isPending ? 'Đang lưu…' : 'Lưu học phí'}
          </button>
          {saved && <span className="text-sm font-semibold text-emerald-700">Đã lưu</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white px-5 py-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={classroom.joinEnabled}
            disabled={toggleJoin.isPending}
            onChange={(event) => toggleJoin.mutate(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              Nhận học viên mới
            </span>
            <span className="block text-[11px] leading-4 text-slate-500">
              Tắt khi lớp đã đủ người — mã lớp tạm ngừng hoạt động, học viên cũ không bị ảnh hưởng.
            </span>
          </span>
        </label>
      </section>

      {!classroom.systemContentEnabled && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">Lớp chưa mở kho đề hệ thống</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            Hiện bạn chỉ giao được đề tự soạn. Liên hệ quản trị để mở toàn bộ ngân hàng đề của
            hệ thống cho lớp này.
          </p>
        </section>
      )}
    </div>
  );
}

/** Overlay mời vào lớp: mã cỡ lớn + QR để học viên quét. */
function InviteDialog({ classroom, onClose }: { classroom: Classroom; onClose: () => void }) {
  useEscapeKey(onClose);
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}/lop/tham-gia?ma=${classroom.joinCode}`;

  // QR dựng bằng dịch vụ ngoài thay vì thêm thư viện: ảnh chỉ mã hoá một URL
  // công khai, không kèm thông tin riêng tư nào.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard — mã vẫn hiện to để chép tay.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-7 text-center"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-base font-bold text-slate-900">Mời học viên vào lớp</h2>
        <p className="mt-0.5 text-xs text-slate-500">{classroom.name}</p>

        <img
          src={qrUrl}
          alt={`Mã QR vào lớp ${classroom.joinCode}`}
          width={160}
          height={160}
          className="mx-auto mt-4 h-40 w-40 rounded-2xl border border-border"
        />

        <p className="mt-4 rounded-2xl bg-brand-50 py-3.5 font-mono text-2xl font-bold tracking-[0.2em] text-brand-800">
          {classroom.joinCode}
        </p>

        {!classroom.joinEnabled && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Lớp đang tắt nhận học viên mới — bật lại trong Cài đặt lớp.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {copied ? 'Đã chép!' : 'Sao chép link'}
          </button>
          <a
            href={qrUrl}
            download={`qr-lop-${classroom.joinCode}.png`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface"
          >
            Tải QR
          </a>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

function PricingBadge({ classroom }: { classroom: Classroom }) {
  const paid = classroom.pricingType === 'PAID' && classroom.priceAmount > 0;
  return (
    <Badge tone={paid ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
      {paid ? `${formatCurrency(classroom.priceAmount)}/khoá` : 'Miễn phí'}
    </Badge>
  );
}

function SystemContentBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge tone={enabled ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-border bg-surface-muted text-slate-600'}>
      Đề hệ thống: {enabled ? 'Bật' : 'Tắt'}
    </Badge>
  );
}

function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide',
        tone,
      )}
    >
      {children}
    </span>
  );
}

function Breadcrumb() {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
      <Link to="/" className="hover:text-brand-800">
        Trang chủ
      </Link>
      <span aria-hidden="true">›</span>
      <span className="font-semibold text-stone-800">Lớp học của tôi</span>
    </nav>
  );
}
