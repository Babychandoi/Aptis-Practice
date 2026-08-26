import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { adminExamPredictionApi, catalogApi } from '@/api/endpoints';
import { useComponents, useExamVersions, useParts } from '@/features/catalog/catalogQueries';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import type { AdminExamPrediction, SaveExamPredictionRequest } from '@/types/api';

const EMPTY_FORM: SaveExamPredictionRequest = {
  predictDate: new Date().toISOString().slice(0, 10),
  topicId: '',
  componentId: '',
  partId: null,
  priority: 'HOT',
  label: null,
  sectionLabel: null,
  source: 'Aptistest.edu.vn',
  status: 'PUBLISHED',
  displayOrder: 0,
};

/**
 * Nhập dự đoán đề: chủ đề nào khả năng ra thi trong ngày.
 *
 * <p>Hiện {@code questionSetCount} ngay trong danh sách để thấy chủ đề nào chưa
 * có đề — học viên bấm vào mục đó sẽ ra lượt rỗng, nên cần biết mà bổ sung đề
 * hoặc chọn chủ đề khác.
 */
export function ExamPredictionAdminPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<string>('');
  const [form, setForm] = useState<SaveExamPredictionRequest>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['admin-exam-predictions', date],
    queryFn: () => adminExamPredictionApi.list(date || undefined),
  });
  // Kỹ năng thuộc phiên bản đề đang hoạt động; dùng hook chung để chia sẻ cache
  // với các trang khác.
  const examVersionsQuery = useExamVersions();
  const examVersionId = examVersionsQuery.data?.[0]?.id;
  const componentsQuery = useComponents(examVersionId);
  const partsQuery = useParts(form.componentId || undefined);
  const topicsQuery = useQuery({
    queryKey: ['admin-topics'],
    queryFn: () => catalogApi.topics(),
    staleTime: 30 * 60_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-exam-predictions'] });
  };
  const fail = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : 'Không lưu được, thử lại sau');

  const save = useMutation({
    mutationFn: (body: SaveExamPredictionRequest) =>
      editingId
        ? adminExamPredictionApi.update(editingId, body)
        : adminExamPredictionApi.create(body),
    onSuccess: () => {
      setForm({ ...EMPTY_FORM, predictDate: form.predictDate, source: form.source });
      setEditingId(null);
      setError(null);
      invalidate();
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminExamPredictionApi.remove(id),
    onSuccess: invalidate,
    onError: fail,
  });

  // Nhóm theo ngày để dễ soát: một ngày thường có vài chục mục.
  const grouped = useMemo(() => {
    const map = new Map<string, AdminExamPrediction[]>();
    for (const item of listQuery.data ?? []) {
      const bucket = map.get(item.predictDate) ?? [];
      bucket.push(item);
      map.set(item.predictDate, bucket);
    }
    return [...map.entries()];
  }, [listQuery.data]);

  const startEdit = (item: AdminExamPrediction) => {
    setEditingId(item.id);
    setError(null);
    setForm({
      predictDate: item.predictDate,
      topicId: item.topicId,
      componentId: item.componentId,
      partId: item.partId,
      priority: item.priority,
      label: item.label,
      sectionLabel: item.sectionLabel,
      source: item.source,
      status: item.status,
      displayOrder: item.displayOrder,
    });
  };

  const submit = () => {
    if (!form.topicId || !form.componentId) {
      setError('Cần chọn kỹ năng và chủ đề');
      return;
    }
    save.mutate(form);
  };

  if (listQuery.isPending) return <LoadingBlock label="Đang tải dự đoán đề…" />;
  if (listQuery.error) {
    return (
      <ErrorBlock message="Không tải được danh sách" onRetry={() => void listQuery.refetch()} />
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dự đoán đề</h1>
          <p className="mt-1 text-xs text-slate-500">
            Chủ đề khả năng ra thi theo ngày. Học viên bấm vào là luyện ngay đề của chủ đề đó.
          </p>
        </div>
        <label className="text-xs font-semibold text-slate-600">
          Lọc theo ngày
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="input mt-1 block"
          />
        </label>
      </header>

      {/* Form thêm / sửa */}
      <section className="rounded-2xl border border-border bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-900">
          {editingId ? 'Sửa mục dự đoán' : 'Thêm mục dự đoán'}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600">
            Ngày dự đoán
            <input
              type="date"
              value={form.predictDate}
              onChange={(e) => setForm({ ...form, predictDate: e.target.value })}
              className="input mt-1 block w-full"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Kỹ năng
            <select
              value={form.componentId}
              onChange={(e) =>
                // Đổi kỹ năng thì bỏ part cũ: part thuộc kỹ năng khác sẽ bị
                // backend từ chối.
                setForm({ ...form, componentId: e.target.value, partId: null })
              }
              className="input mt-1 block w-full"
            >
              <option value="">— chọn —</option>
              {(componentsQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Part <span className="font-normal text-slate-400">(bỏ trống = cả kỹ năng)</span>
            <select
              value={form.partId ?? ''}
              onChange={(e) => setForm({ ...form, partId: e.target.value || null })}
              disabled={!form.componentId}
              className="input mt-1 block w-full"
            >
              <option value="">— cả kỹ năng —</option>
              {(partsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Chủ đề
            <select
              value={form.topicId}
              onChange={(e) => setForm({ ...form, topicId: e.target.value })}
              className="input mt-1 block w-full"
            >
              <option value="">— chọn —</option>
              {(topicsQuery.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Mức ưu tiên
            <select
              value={form.priority ?? 'HOT'}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as 'HOT' | 'BACKUP' })
              }
              className="input mt-1 block w-full"
            >
              <option value="HOT">Hot</option>
              <option value="BACKUP">Backup</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Nhóm hiển thị
            <input
              type="text"
              value={form.sectionLabel ?? ''}
              placeholder="Part 5, Q16-17, Part 2+3…"
              onChange={(e) => setForm({ ...form, sectionLabel: e.target.value || null })}
              className="input mt-1 block w-full"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Nhãn <span className="font-normal text-slate-400">(bỏ trống = tên chủ đề)</span>
            <input
              type="text"
              value={form.label ?? ''}
              onChange={(e) => setForm({ ...form, label: e.target.value || null })}
              className="input mt-1 block w-full"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Nguồn
            <input
              type="text"
              value={form.source ?? ''}
              onChange={(e) => setForm({ ...form, source: e.target.value || null })}
              className="input mt-1 block w-full"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Trạng thái
            <select
              value={form.status ?? 'PUBLISHED'}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as 'DRAFT' | 'PUBLISHED' })
              }
              className="input mt-1 block w-full"
            >
              <option value="PUBLISHED">Đã công bố</option>
              <option value="DRAFT">Nháp</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Thứ tự
            <input
              type="number"
              value={form.displayOrder ?? 0}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
              className="input mt-1 block w-full"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs leading-5 text-red-700">
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={save.isPending}
            className="btn-primary min-h-[38px] px-4 text-xs disabled:opacity-60"
          >
            {save.isPending ? 'Đang lưu…' : editingId ? 'Cập nhật' : 'Thêm mục'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setError(null);
              }}
              className="min-h-[38px] rounded-xl border border-border px-4 text-xs font-bold text-slate-700 hover:bg-surface"
            >
              Huỷ
            </button>
          )}
        </div>
      </section>

      {/* Danh sách */}
      {grouped.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">Chưa có mục dự đoán nào.</p>
      ) : (
        grouped.map(([day, items]) => (
          <section key={day} className="rounded-2xl border border-border bg-white">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">{formatDate(day)}</h2>
              <span className="font-mono text-[10px] font-bold text-slate-500">
                {items.length} mục
              </span>
            </header>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase',
                      item.priority === 'HOT'
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-emerald-50 text-emerald-700',
                    )}
                  >
                    {item.priority}
                  </span>
                  {item.status === 'DRAFT' && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                      Nháp
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                    {item.label || item.topicName}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    {item.componentCode}
                    {item.partName ? ` · ${item.partName}` : ' · cả kỹ năng'}
                    {item.sectionLabel ? ` · ${item.sectionLabel}` : ''}
                  </span>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold',
                      item.questionSetCount === 0
                        ? 'bg-red-50 text-red-700'
                        : 'bg-surface text-slate-600',
                    )}
                    title={
                      item.questionSetCount === 0
                        ? 'Chưa có đề — học viên bấm vào sẽ ra lượt rỗng'
                        : 'Số đề làm được'
                    }
                  >
                    {item.questionSetCount} đề
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="shrink-0 text-xs font-bold text-brand-700 hover:text-brand-800"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(item.id)}
                    disabled={remove.isPending}
                    className="shrink-0 text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-60"
                  >
                    Xoá
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
