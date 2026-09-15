import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { adminClassroomApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency } from '@/lib/format';
import { usePermission } from '@/features/admin/usePermission';
import type { CreateTeacherResult, TeacherSettings } from '@/types/api';

type Tab = 'classrooms' | 'teachers' | 'settings';

/** Quản trị lớp học và tài khoản giáo viên. */
export function ClassroomAdminPage() {
  const [tab, setTab] = useState<Tab>('classrooms');
  const canManage = usePermission().has('classroom:admin');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Lớp học &amp; giáo viên</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Tạo tài khoản giáo viên, bật/tắt kho đề hệ thống cho từng lớp.
        </p>
      </header>

      <div role="tablist" className="flex flex-wrap gap-2">
        {(
          [
            ['classrooms', 'Lớp học'],
            ['teachers', 'Tài khoản giáo viên'],
            ['settings', 'Cấu hình'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              'rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
              tab === key
                ? 'border-transparent bg-brand-700 text-white'
                : 'border-border bg-white text-slate-700 hover:bg-surface',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'classrooms' && <ClassroomTable canManage={canManage} />}
      {tab === 'teachers' && <TeacherTable canManage={canManage} />}
      {tab === 'settings' && <SettingsForm canManage={canManage} />}
    </div>
  );
}

function ClassroomTable({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'classrooms'],
    queryFn: () => adminClassroomApi.list(),
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      adminClassroomApi.toggleSystemContent(id, enabled),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'classrooms'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không đổi được'),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được danh sách lớp" onRetry={() => void query.refetch()} />;
  }
  if (query.data.content.length === 0) {
    return (
      <p className="card text-center text-sm text-slate-500">
        Chưa có lớp nào. Tạo tài khoản giáo viên ở tab bên cạnh — hệ thống tự sinh lớp kèm theo.
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

      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="bg-surface-paper">
              {['Lớp', 'Giáo viên', 'Học viên', 'Học phí', 'Đề hệ thống'].map((header) => (
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
            {query.data.content.map((classroom) => (
              <tr key={classroom.id} className="border-t border-border-subtle">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{classroom.name}</p>
                  <p className="font-mono text-[11px] text-slate-500">{classroom.joinCode}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-700">{classroom.teacherName || '—'}</p>
                  <p className="font-mono text-[11px] text-slate-500">{classroom.teacherEmail}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {classroom.studentCount}/{classroom.maxStudents}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {classroom.pricingType === 'PAID' && classroom.priceAmount > 0
                    ? formatCurrency(classroom.priceAmount)
                    : 'Miễn phí'}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={!canManage || toggle.isPending}
                    onClick={() =>
                      toggle.mutate({
                        id: classroom.id,
                        enabled: !classroom.systemContentEnabled,
                      })
                    }
                    className="flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Đề hệ thống cho lớp ${classroom.name}`}
                  >
                    <span
                      className={clsx(
                        'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                        classroom.systemContentEnabled ? 'bg-brand-600' : 'bg-surface-muted',
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                          classroom.systemContentEnabled ? 'left-[18px]' : 'left-0.5',
                        )}
                      />
                    </span>
                    <span
                      className={clsx(
                        'text-xs font-semibold',
                        classroom.systemContentEnabled ? 'text-brand-800' : 'text-slate-500',
                      )}
                    >
                      {classroom.systemContentEnabled ? 'Bật' : 'Tắt'}
                    </span>
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

function TeacherTable({ canManage }: { canManage: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);

  const query = useQuery({
    queryKey: ['admin', 'classrooms', 'teachers'],
    queryFn: adminClassroomApi.teachers,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Mỗi tài khoản giáo viên gắn với đúng một lớp, hệ thống tự sinh khi tạo.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            + Tạo tài khoản giáo viên
          </button>
        )}
      </div>

      {query.isPending ? (
        <LoadingBlock label="Đang tải…" />
      ) : query.error ? (
        <ErrorBlock message="Không tải được danh sách" onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">Chưa có tài khoản giáo viên nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="bg-surface-paper">
                {['Giáo viên', 'Email', 'Lớp', 'Mã lớp', 'Học viên'].map((header) => (
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
              {query.data.map((teacher) => (
                <tr key={teacher.userId} className="border-t border-border-subtle">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {teacher.fullName || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                    {teacher.email}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{teacher.classroomName}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                    {teacher.joinCode}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{teacher.studentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && <CreateTeacherDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function CreateTeacherDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateTeacherResult | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      adminClassroomApi.createTeacher({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        classroomName: classroomName.trim() || undefined,
      }),
    onSuccess: (result) => {
      setCreated(result);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'classrooms'] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không tạo được tài khoản'),
  });

  // Sau khi tạo xong thì hiện thông tin để admin chép gửi cho giáo viên —
  // mật khẩu không xem lại được ở đâu khác.
  if (created) {
    return (
      <Overlay onClose={onClose}>
        <h2 className="text-base font-bold text-slate-900">Đã tạo tài khoản</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Gửi thông tin này cho giáo viên. Mật khẩu không xem lại được sau khi đóng.
        </p>

        <dl className="mt-4 space-y-2 rounded-2xl bg-surface-paper px-4 py-3.5 text-sm">
          <Row label="Email" value={created.email} />
          <Row label="Mật khẩu" value={password} />
          <Row label="Mã lớp" value={created.joinCode} />
        </dl>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          Xong
        </button>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <h2 className="text-base font-bold text-slate-900">Tạo tài khoản giáo viên</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Hệ thống tự tạo một lớp học gắn với tài khoản này.
      </p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          submit.mutate();
        }}
      >
        <Field label="Họ tên giáo viên" value={fullName} onChange={setFullName} placeholder="Nguyễn Lan Phương" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="ten@gmail.com" type="email" />
        <Field
          label="Mật khẩu ban đầu"
          value={password}
          onChange={setPassword}
          placeholder="Tối thiểu 8 ký tự"
          type="text"
          hint="Hiện rõ để admin chép gửi cho giáo viên."
        />
        <Field
          label="Tên lớp (không bắt buộc)"
          value={classroomName}
          onChange={setClassroomName}
          placeholder="Aptis Cấp tốc T9"
          required={false}
        />

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
            {submit.isPending ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function SettingsForm({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<TeacherSettings | null>(null);
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ['admin', 'classrooms', 'settings'],
    queryFn: adminClassroomApi.settings,
  });

  const save = useMutation({
    mutationFn: (body: TeacherSettings) => adminClassroomApi.updateSettings(body),
    onSuccess: () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'classrooms'] });
    },
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error || !query.data) {
    return <ErrorBlock message="Không tải được cấu hình" onRetry={() => void query.refetch()} />;
  }

  const config = draft ?? query.data;

  return (
    <form
      className="max-w-lg space-y-4 rounded-2xl border border-border bg-white px-5 py-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(config);
      }}
    >
      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Nền tảng giữ lại từ học phí lớp (%)
        </span>
        <input
          type="number"
          min={0}
          max={100}
          value={config.platformFeePercent}
          disabled={!canManage}
          onChange={(event) =>
            setDraft({ ...config, platformFeePercent: Number(event.target.value) })
          }
          className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 disabled:bg-surface"
        />
        <span className="mt-1 block text-[11px] text-slate-500">
          Phần còn lại chuyển cho giáo viên.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Trần học viên mặc định mỗi lớp
        </span>
        <input
          type="number"
          min={1}
          value={config.defaultMaxStudents}
          disabled={!canManage}
          onChange={(event) =>
            setDraft({ ...config, defaultMaxStudents: Number(event.target.value) })
          }
          className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 disabled:bg-surface"
        />
        <span className="mt-1 block text-[11px] text-slate-500">
          Áp dụng cho lớp chưa đặt trần riêng.
        </span>
      </label>

      {canManage && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {save.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
          </button>
          {saved && <span className="text-sm font-semibold text-emerald-700">Đã lưu</span>}
        </div>
      )}
    </form>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
      />
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-mono text-sm font-bold text-slate-900">{value}</dd>
    </div>
  );
}
