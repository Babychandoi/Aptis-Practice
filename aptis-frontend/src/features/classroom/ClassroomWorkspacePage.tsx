import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { studentClassroomApi, studentWorkspaceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import { ClassroomSidebar } from '@/features/classroom/ClassroomSidebar';
import type {
  ClassroomPrediction,
  StudentAssignment,
  StudentClassroom,
  SubmissionStatus,
} from '@/types/api';

type Tab = 'assignments' | 'materials' | 'posts' | 'predictions';

const STATUS_LABEL: Record<SubmissionStatus, { text: string; tone: string }> = {
  NOT_STARTED: { text: 'Chưa làm', tone: 'bg-surface-muted text-slate-600' },
  IN_PROGRESS: { text: 'Đang làm', tone: 'bg-blue-50 text-blue-700' },
  SUBMITTED: { text: 'Đã nộp', tone: 'bg-emerald-50 text-emerald-700' },
  LATE: { text: 'Nộp muộn', tone: 'bg-amber-50 text-amber-800' },
  GRADED: { text: 'Đã chấm', tone: 'bg-emerald-50 text-emerald-700' },
};

/**
 * Không gian học tập của một lớp.
 *
 * <p>Học viên vào đây để làm bài được giao, xem tài liệu, bảng tin và dự đoán
 * riêng của giáo viên.
 */
export function ClassroomWorkspacePage() {
  const { classroomId = '' } = useParams();
  const [tab, setTab] = useState<Tab>('assignments');

  const classrooms = useQuery({
    queryKey: ['classrooms', 'mine'],
    queryFn: studentClassroomApi.mine,
  });

  if (classrooms.isPending) return <LoadingBlock label="Đang tải lớp…" />;
  if (classrooms.error) {
    return <ErrorBlock message="Không tải được lớp" onRetry={() => void classrooms.refetch()} />;
  }

  const classroom = classrooms.data.find((row) => row.classroomId === classroomId);
  if (!classroom) {
    return (
      <div className="space-y-4">
        <Breadcrumb />
        <p className="card text-center text-sm text-slate-500">
          Bạn không ở trong lớp này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Breadcrumb />

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{classroom.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Giáo viên: {classroom.teacherName}</p>
      </header>

      {classroom.paymentStatus === 'PENDING' && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <strong>Chưa đóng học phí.</strong> Bạn xem được lớp nhưng chưa làm được bài. Liên hệ
          giáo viên để hoàn tất.
        </p>
      )}

      <div className="flex flex-col gap-5 lg:flex-row">
        <ClassroomSidebar
          title={classroom.name}
          subtitle={`Giáo viên: ${classroom.teacherName}`}
          backTo="/lop-hoc"
          backLabel="Lớp học của tôi"
          value={tab}
          onChange={setTab}
          items={[
            { key: 'assignments', label: 'Bài được giao' },
            { key: 'materials', label: 'Tài liệu' },
            { key: 'posts', label: 'Bảng tin' },
            { key: 'predictions', label: 'Dự đoán đề' },
          ]}
        />

        <div className="min-w-0 flex-1 space-y-4">
          {tab === 'assignments' && (
            <AssignmentList classroomId={classroomId} classroom={classroom} />
          )}
          {tab === 'materials' && <MaterialList classroomId={classroomId} />}
          {tab === 'posts' && <PostList classroomId={classroomId} />}
          {tab === 'predictions' && <PredictionList classroomId={classroomId} />}
        </div>
      </div>
    </div>
  );
}

function AssignmentList({
  classroomId,
  classroom,
}: {
  classroomId: string;
  classroom: StudentClassroom;
}) {
  const query = useQuery({
    queryKey: ['classrooms', classroomId, 'assignments'],
    queryFn: () => studentWorkspaceApi.assignments(classroomId),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được bài giao" onRetry={() => void query.refetch()} />;
  }
  if (query.data.length === 0) {
    return (
      <p className="card text-center text-sm text-slate-500">
        Giáo viên chưa giao bài nào.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {query.data.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          classroomId={classroomId}
          assignment={assignment}
          canPractice={classroom.canPractice}
        />
      ))}
    </div>
  );
}

function AssignmentCard({
  classroomId,
  assignment,
  canPractice,
}: {
  classroomId: string;
  assignment: StudentAssignment;
  canPractice: boolean;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const status = STATUS_LABEL[assignment.status];

  const start = useMutation({
    mutationFn: () => studentWorkspaceApi.start(classroomId, assignment.id),
    onSuccess: (result) => navigate(`/attempts/${result.attemptId}`),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không mở được bài, thử lại sau'),
  });

  const done = assignment.status === 'SUBMITTED' || assignment.status === 'GRADED'
    || assignment.status === 'LATE';

  return (
    <article className="rounded-2xl border border-border bg-white px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900">{assignment.title}</h3>
          {assignment.instructions && (
            <p className="mt-0.5 text-xs leading-5 text-slate-600">{assignment.instructions}</p>
          )}
          {assignment.dueAt && (
            <p
              className={clsx(
                'mt-1 text-xs',
                assignment.overdue && !done ? 'font-semibold text-red-600' : 'text-slate-500',
              )}
            >
              {assignment.overdue && !done ? 'Quá hạn ' : 'Hạn nộp '}
              {formatDate(assignment.dueAt)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase',
              status.tone,
            )}
          >
            {status.text}
          </span>

          {assignment.attemptId && done ? (
            <Link
              to={`/attempts/${assignment.attemptId}/result`}
              className="rounded-xl bg-surface-muted px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-surface"
            >
              Xem kết quả
            </Link>
          ) : (
            <button
              type="button"
              disabled={!canPractice || start.isPending}
              onClick={() => {
                setError(null);
                start.mutate();
              }}
              className="rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {start.isPending
                ? 'Đang mở…'
                : assignment.status === 'IN_PROGRESS'
                  ? 'Làm tiếp'
                  : 'Làm bài'}
            </button>
          )}
        </div>
      </div>

      {assignment.teacherScore != null && (
        <div className="mt-3 rounded-xl bg-brand-50 px-3.5 py-2.5">
          <p className="text-sm font-bold text-brand-800">
            Điểm giáo viên: {assignment.teacherScore}
          </p>
          {assignment.teacherComment && (
            <p className="mt-1 text-xs leading-5 text-brand-900">{assignment.teacherComment}</p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </article>
  );
}

function MaterialList({ classroomId }: { classroomId: string }) {
  const query = useQuery({
    queryKey: ['classrooms', classroomId, 'materials'],
    queryFn: () => studentWorkspaceApi.materials(classroomId),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (!query.data || query.data.length === 0) {
    return <EmptyBox text="Giáo viên chưa thêm tài liệu nào." />;
  }

  return (
    <ul className="space-y-2">
      {query.data.map((material) => (
        <li
          key={material.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3.5"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">{material.title}</span>
            <span className="block text-[11px] text-slate-500">
              {formatDate(material.createdAt)}
            </span>
          </span>
          {material.linkUrl && (
            <a
              href={material.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-xl bg-brand-100 px-3.5 py-2 text-xs font-bold text-brand-800 transition-colors hover:bg-brand-200"
            >
              Mở
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function PostList({ classroomId }: { classroomId: string }) {
  const query = useQuery({
    queryKey: ['classrooms', classroomId, 'posts'],
    queryFn: () => studentWorkspaceApi.posts(classroomId),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (!query.data || query.data.length === 0) {
    return <EmptyBox text="Chưa có thông báo nào." />;
  }

  return (
    <div className="space-y-2.5">
      {query.data.map((post) => (
        <article key={post.id} className="rounded-2xl border border-border bg-white px-4 py-3.5">
          <h3 className="font-bold text-slate-900">{post.title}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{formatDate(post.createdAt)}</p>
          {post.content && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {post.content}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function PredictionList({ classroomId }: { classroomId: string }) {
  const query = useQuery({
    queryKey: ['classrooms', classroomId, 'predictions'],
    queryFn: () => studentWorkspaceApi.predictions(classroomId),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (!query.data || query.data.length === 0) {
    return <EmptyBox text="Giáo viên chưa đăng dự đoán nào cho lớp." />;
  }

  return (
    <div className="space-y-2.5">
      {query.data.map((prediction) => (
        <PredictionCard
          key={prediction.id}
          classroomId={classroomId}
          prediction={prediction}
        />
      ))}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <p className="card text-center text-sm text-slate-500">{text}</p>;
}

function Breadcrumb(): ReactNode {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
      <Link to="/" className="hover:text-brand-800">
        Trang chủ
      </Link>
      <span aria-hidden="true">›</span>
      <Link to="/lop-hoc" className="hover:text-brand-800">
        Lớp học của tôi
      </Link>
      <span aria-hidden="true">›</span>
      <span className="font-semibold text-stone-800">Không gian lớp</span>
    </nav>
  );
}

/**
 * Một mục dự đoán của lớp.
 *
 * <p>Bấm vào là mở luôn đề để luyện — đó là điểm khác với bản cũ vốn chỉ hiện
 * chữ. Đề lấy từ hai nguồn: đề giáo viên chỉ đích danh, và đề cùng chủ đề.
 */
function PredictionCard({
  classroomId,
  prediction,
}: {
  classroomId: string;
  prediction: ClassroomPrediction;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const open = useMutation({
    mutationFn: () => studentWorkspaceApi.practicePrediction(classroomId, prediction.id),
    onSuccess: (result) => navigate(`/attempts/${result.attemptId}`),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Không mở được đề, thử lại sau'),
  });

  const moDuoc = prediction.openableCount > 0;

  return (
    <article className="rounded-2xl border border-border bg-white px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-900">{prediction.label || prediction.title}</h3>
            {prediction.priority === 'HOT' && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-red-700">
                Khả năng cao
              </span>
            )}
            {prediction.componentName && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-brand-800">
                {prediction.componentName}
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] text-slate-500">
            {[
              prediction.partName,
              prediction.topicName && `Chủ đề: ${prediction.topicName}`,
              prediction.predictDate && `Ngày thi ${formatDate(prediction.predictDate)}`,
              prediction.source && `Nguồn: ${prediction.source}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {prediction.content && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {prediction.content}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <button
            type="button"
            disabled={!moDuoc || open.isPending}
            onClick={() => {
              setError(null);
              open.mutate();
            }}
            className="rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {open.isPending ? 'Đang mở…' : 'Luyện ngay'}
          </button>
          <p className="mt-1 text-[10px] text-slate-500">
            {moDuoc ? `${prediction.openableCount} đề` : 'Chưa có đề'}
          </p>
        </div>
      </div>
    </article>
  );
}
