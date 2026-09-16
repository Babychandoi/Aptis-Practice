import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { catalogApi, teacherContentApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { QuestionSetPreviewDialog } from '@/features/classroom/QuestionSetPreviewDialog';
import type {
  Classroom,
  ClassroomPrediction,
  ClassroomPredictionStatus,
  PredictionPriority,
} from '@/types/api';

/**
 * Dự đoán đề riêng của lớp.
 *
 * <p>Làm ngang bản của admin: gắn vào chủ đề thật nên học viên bấm vào là mở
 * được đề để luyện, có ngày thi dự đoán, mức HOT/dự phòng, nháp/đăng. Thêm một
 * thứ admin không có — giáo viên gắn được cả đề do chính mình soạn.
 */
export function TeacherPredictionsTab({ classroom }: { classroom: Classroom }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClassroomPrediction | 'new' | null>(null);

  const query = useQuery({
    queryKey: ['teacher', 'classroom', 'predictions'],
    queryFn: teacherContentApi.predictions,
  });

  const remove = useMutation({
    mutationFn: teacherContentApi.deletePrediction,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'predictions'] }),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được dự đoán" onRetry={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Nhận định của bạn cho lớp. Gắn chủ đề để học viên bấm vào là luyện được ngay.
        </p>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          + Thêm dự đoán
        </button>
      </div>

      {query.data.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">
          Chưa có dự đoán nào. Bấm “Thêm dự đoán” để đăng nhận định đầu tiên.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {query.data.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border bg-white px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{row.label || row.title}</h3>
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase',
                        row.priority === 'HOT'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-surface-muted text-slate-600',
                      )}
                    >
                      {row.priority === 'HOT' ? 'Khả năng cao' : 'Dự phòng'}
                    </span>
                    {row.status === 'DRAFT' && (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-600">
                        Nháp
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      row.componentName,
                      row.partName,
                      row.topicName && `Chủ đề: ${row.topicName}`,
                      row.predictDate && `Ngày thi ${formatDate(row.predictDate)}`,
                      row.sectionLabel,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>

                  {/* Con số này quyết định mục có bấm được không, nên nói thẳng
                      để giáo viên biết mình đã gắn đủ đề chưa. */}
                  <p className="mt-1 text-[11px]">
                    {row.openableCount > 0 ? (
                      <span className="font-semibold text-emerald-700">
                        {row.openableCount} đề học viên mở được
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700">
                        Chưa có đề nào — học viên chỉ đọc được chữ
                      </span>
                    )}
                    {row.source && (
                      <span className="text-slate-500"> · Nguồn: {row.source}</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="rounded-lg bg-brand-100 px-2.5 py-1.5 text-xs font-bold text-brand-800 transition-colors hover:bg-brand-200"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá dự đoán “${row.label || row.title}”?`)) {
                        remove.mutate(row.id);
                      }
                    }}
                    className="ml-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PredictionDialog
          classroom={classroom}
          prediction={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PredictionDialog({
  classroom,
  prediction,
  onClose,
}: {
  classroom: Classroom;
  prediction: ClassroomPrediction | null;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const queryClient = useQueryClient();

  const [componentId, setComponentId] = useState(prediction?.componentId ?? '');
  const [partId, setPartId] = useState(prediction?.partId ?? '');
  const [topicId, setTopicId] = useState(prediction?.topicId ?? '');
  const [predictDate, setPredictDate] = useState(prediction?.predictDate ?? '');
  const [priority, setPriority] = useState<PredictionPriority>(prediction?.priority ?? 'HOT');
  const [label, setLabel] = useState(prediction?.label ?? '');
  const [sectionLabel, setSectionLabel] = useState(prediction?.sectionLabel ?? '');
  const [source, setSource] = useState(prediction?.source ?? '');
  const [title, setTitle] = useState(prediction?.title ?? '');
  const [content, setContent] = useState(prediction?.content ?? '');
  const [previewing, setPreviewing] = useState<{ id: string; title: string } | null>(null);
  const [selectedSets, setSelectedSets] = useState<string[]>(
    prediction?.questionSets.map((s) => s.id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const examVersions = useQuery({
    queryKey: ['exam-versions'],
    queryFn: () => catalogApi.examVersions(),
  });

  const components = useQuery({
    queryKey: ['components', examVersions.data?.[0]?.id],
    queryFn: () => catalogApi.components(examVersions.data![0]!.id),
    enabled: !!examVersions.data?.[0]?.id,
  });

  const parts = useQuery({
    queryKey: ['parts', componentId],
    queryFn: () => catalogApi.parts(componentId),
    enabled: !!componentId,
  });

  const topics = useQuery({
    queryKey: ['topics'],
    queryFn: catalogApi.topics,
  });

  // Đề tự soạn luôn gắn được; đề hệ thống chỉ khi admin bật kho đề cho lớp.
  const ownSets = useQuery({
    queryKey: ['teacher', 'classroom', 'question-sets'],
    queryFn: teacherContentApi.myQuestionSets,
  });

  const systemSets = useQuery({
    queryKey: ['parts', partId, 'question-sets'],
    queryFn: () => catalogApi.questionSets(partId, 0, 50),
    enabled: !!partId && classroom.systemContentEnabled,
  });

  const chonDuoc = useMemo(() => {
    const own = (ownSets.data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      hint: `${s.componentName} · ${s.partName} · đề của bạn`,
    }));
    const sys = (systemSets.data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      hint: 'đề hệ thống',
    }));
    return [...own, ...sys];
  }, [ownSets.data, systemSets.data]);

  const save = useMutation({
    mutationFn: (status: ClassroomPredictionStatus) => {
      const body = {
        componentId: componentId || null,
        topicId: topicId || null,
        partId: partId || null,
        predictDate: predictDate || null,
        priority,
        label: label.trim() || null,
        sectionLabel: sectionLabel.trim() || null,
        source: source.trim() || null,
        status,
        title: title.trim(),
        content: content.trim() || null,
        questionSetIds: selectedSets,
      };
      return prediction
        ? teacherContentApi.updatePrediction(prediction.id, body)
        : teacherContentApi.addPrediction(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'classroom', 'predictions'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  const submit = (status: ClassroomPredictionStatus) => {
    setError(null);
    if (!title.trim()) {
      setError('Nhập tiêu đề trước khi lưu');
      return;
    }
    save.mutate(status);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-base font-bold text-slate-900">
          {prediction ? 'Sửa dự đoán' : 'Thêm dự đoán cho lớp'}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Gắn chủ đề hoặc chọn đề cụ thể thì học viên bấm vào là luyện được ngay.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Tiêu đề
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Dự đoán Speaking Part 2 tuần này"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Kỹ năng
              </span>
              <select
                value={componentId}
                onChange={(event) => {
                  setComponentId(event.target.value);
                  setPartId('');
                }}
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
              >
                <option value="">— Chọn —</option>
                {(components.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Part (không bắt buộc)
              </span>
              <select
                value={partId}
                disabled={!componentId}
                onChange={(event) => setPartId(event.target.value)}
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 disabled:opacity-60"
              >
                <option value="">— Cả kỹ năng —</option>
                {(parts.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Chủ đề
            </span>
            <select
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            >
              <option value="">— Không gắn chủ đề —</option>
              {(topics.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-slate-500">
              Gắn chủ đề là học viên mở được mọi đề cùng chủ đề đó.
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Ngày thi dự đoán
              </span>
              <input
                type="date"
                value={predictDate}
                onChange={(event) => setPredictDate(event.target.value)}
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Mức
              </span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as PredictionPriority)}
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
              >
                <option value="HOT">Khả năng ra cao</option>
                <option value="BACKUP">Dự phòng</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Nhãn hiển thị
              </span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Để trống thì lấy tiêu đề"
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Nhóm
              </span>
              <input
                value={sectionLabel}
                onChange={(event) => setSectionLabel(event.target.value)}
                placeholder="Part 2+3"
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Nguồn tin
            </span>
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Học viên thi ngày 12/9 kể lại"
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Ghi chú cho học viên
            </span>
            <textarea
              value={content}
              rows={3}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Lý do dự đoán, gợi ý ôn tập…"
              className="w-full resize-y rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <div>
            <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Chọn đề cụ thể ({selectedSets.length} đã chọn)
            </span>
            {!classroom.systemContentEnabled && (
              <p className="mb-1.5 rounded-xl bg-surface-paper px-3 py-2 text-[11px] leading-5 text-slate-600">
                Lớp chưa mở kho đề hệ thống nên chỉ chọn được đề bạn tự soạn. Liên hệ quản trị
                để mở.
              </p>
            )}
            {chonDuoc.length === 0 ? (
              <p className="rounded-xl bg-surface-paper px-3 py-2.5 text-xs text-slate-600">
                {partId
                  ? 'Không có đề nào ở part này.'
                  : 'Chọn kỹ năng và part ở trên để thấy đề hệ thống, hoặc soạn đề riêng ở tab Đề của tôi.'}
              </p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {chonDuoc.map((set) => (
                  <label
                    key={set.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSets.includes(set.id)}
                      onChange={(event) =>
                        setSelectedSets((prev) =>
                          event.target.checked
                            ? [...prev, set.id]
                            : prev.filter((id) => id !== set.id),
                        )
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-slate-800">{set.title}</span>
                      <span className="block text-[11px] text-slate-500">{set.hint}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setPreviewing({ id: set.id, title: set.title || 'Đề' });
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => submit('DRAFT')}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-surface disabled:opacity-60"
            >
              Lưu nháp
            </button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => submit('PUBLISHED')}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {save.isPending ? 'Đang lưu…' : 'Đăng cho lớp'}
            </button>
          </div>
        </div>
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
