import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { studentClassroomApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatCurrency } from '@/lib/format';
import type { StudentClassroom } from '@/types/api';

/**
 * Lớp học của học viên.
 *
 * <p>Vào bằng mã lớp hoặc quét QR — QR chứa đường dẫn kèm `?ma=`, nên quét
 * xong là ô nhập đã điền sẵn, chỉ việc bấm xác nhận.
 */
export function StudentClassroomPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Mã từ QR điền sẵn vào ô nhập, nhưng KHÔNG tự vào lớp: người dùng cần thấy
  // mình sắp vào lớp nào trước khi xác nhận.
  const codeFromQr = searchParams.get('ma') ?? '';
  const [code, setCode] = useState(codeFromQr.toUpperCase());
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (codeFromQr) {
      setCode(codeFromQr.toUpperCase());
    }
  }, [codeFromQr]);

  const query = useQuery({
    queryKey: ['classrooms', 'mine'],
    queryFn: studentClassroomApi.mine,
  });

  const join = useMutation({
    mutationFn: () => studentClassroomApi.join(code.trim()),
    onSuccess: (classroom) => {
      setMessage({ text: `Đã tham gia lớp ${classroom.name}.`, ok: true });
      setCode('');
      // Xoá tham số QR khỏi URL để tải lại trang không gợi ý vào lại.
      if (searchParams.has('ma')) {
        searchParams.delete('ma');
        setSearchParams(searchParams, { replace: true });
      }
      void queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    },
    onError: (err) =>
      setMessage({
        text: err instanceof ApiError ? err.message : 'Không tham gia được, thử lại sau',
        ok: false,
      }),
  });

  return (
    <div className="space-y-5">
      <Breadcrumb />

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lớp học của tôi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lớp do giáo viên mở. Nhập mã hoặc quét QR giáo viên đưa để tham gia.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-white px-5 py-5">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Tham gia lớp
        </h2>
        <form
          className="mt-2.5 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(null);
            join.mutate();
          }}
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="VD: DEV123"
            maxLength={16}
            className="min-w-0 flex-1 rounded-xl border border-border px-3.5 py-3 text-center font-mono text-lg font-bold uppercase tracking-[0.2em] outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={!code.trim() || join.isPending}
            className="shrink-0 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {join.isPending ? 'Đang vào…' : 'Tham gia'}
          </button>
        </form>

        {message && (
          <p
            role="alert"
            className={clsx(
              'mt-2.5 rounded-xl px-3 py-2 text-sm font-semibold',
              message.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
            )}
          >
            {message.text}
          </p>
        )}
      </section>

      {query.isPending ? (
        <LoadingBlock label="Đang tải lớp…" />
      ) : query.error ? (
        <ErrorBlock message="Không tải được lớp học" onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">
          Bạn chưa tham gia lớp nào. Hỏi giáo viên mã lớp để bắt đầu.
        </p>
      ) : (
        <div className="space-y-3">
          {query.data.map((classroom) => (
            <ClassroomCard key={classroom.classroomId} classroom={classroom} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassroomCard({ classroom }: { classroom: StudentClassroom }) {
  const paid = classroom.pricingType === 'PAID' && classroom.priceAmount > 0;

  return (
    <Link
      to={`/lop-hoc/${classroom.classroomId}`}
      className="block rounded-2xl border border-border bg-white px-5 py-4 transition-colors hover:border-brand-300 hover:bg-surface-paper"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{classroom.name}</h2>
          <p className="mt-0.5 text-xs text-slate-500">Giáo viên: {classroom.teacherName}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge
            tone={
              paid
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }
          >
            {paid ? `${formatCurrency(classroom.priceAmount)}/khoá` : 'Miễn phí'}
          </Badge>
          <Badge
            tone={
              classroom.systemContentEnabled
                ? 'border-brand-200 bg-brand-50 text-brand-800'
                : 'border-border bg-surface-muted text-slate-600'
            }
          >
            Đề hệ thống: {classroom.systemContentEnabled ? 'Bật' : 'Tắt'}
          </Badge>
        </div>
      </div>

      {classroom.paymentStatus === 'PENDING' && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
          <strong>Chưa đóng học phí.</strong> Bạn xem được lớp nhưng chưa làm được bài. Liên hệ
          giáo viên để hoàn tất.
        </p>
      )}

      {!classroom.systemContentEnabled && classroom.canPractice && (
        <p className="mt-3 rounded-xl bg-surface-paper px-3 py-2.5 text-xs leading-5 text-slate-600">
          Lớp này chưa mở kho đề hệ thống — bạn làm được bài giáo viên giao, còn phần luyện tập
          chung vẫn theo gói Premium của riêng bạn.
        </p>
      )}

      <p className="mt-3 text-xs font-semibold text-brand-700">Vào lớp →</p>
    </Link>
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
