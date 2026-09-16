import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { catalogApi, teacherAuthoringApi, teacherBlueprintApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import type {
  BlueprintRule,
  BlueprintSelectionMode,
  Classroom,
  TeacherBlueprint,
} from '@/types/api';

/**
 * Bài thi giáo viên tự ghép cho lớp.
 *
 * <p>Hai mức: full một kỹ năng, hoặc đủ 5 kỹ năng. Và hai cách chọn đề — chọn
 * tay từng đề để cả lớp làm cùng một bộ, hoặc đặt luật cho hệ thống bốc, mỗi
 * học viên ra đề khác nhau.
 */
export function TeacherBlueprintsTab({ classroom }: { classroom: Classroom }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TeacherBlueprint | 'new' | null>(null);

  const query = useQuery({
    queryKey: ['teacher', 'blueprints'],
    queryFn: teacherBlueprintApi.list,
  });

  const remove = useMutation({
    mutationFn: teacherBlueprintApi.remove,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['teacher', 'blueprints'] }),
  });

  if (query.isPending) return <LoadingBlock label="Đang tải…" />;
  if (query.error) {
    return <ErrorBlock message="Không tải được bài thi" onRetry={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Ghép bài thi cho lớp: full một kỹ năng hoặc đủ 5 kỹ năng. Giao qua tab Bài giao.
        </p>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          + Ghép bài thi
        </button>
      </div>

      {query.data.length === 0 ? (
        <div className="card space-y-2 text-center">
          <p className="text-sm text-slate-600">Chưa có bài thi nào.</p>
          <p className="text-xs leading-5 text-slate-500">
            Ghép đề lẻ thành một bài hoàn chỉnh để lớp làm thử như thi thật.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {query.data.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border bg-white px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{row.name}</h3>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-brand-800">
                      {row.componentName}
                    </span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-600">
                      {row.selectionMode === 'FIXED' ? 'Chọn tay' : 'Hệ thống bốc'}
                    </span>
                  </div>
                  {row.description && (
                    <p className="mt-1 text-xs leading-5 text-slate-600">{row.description}</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500">
                    {row.selectionMode === 'FIXED'
                      ? `${row.questionSetCount} đề cố định`
                      : `${row.ruleCount} part · bốc ${row.questionSetCount} đề mỗi lượt`}
                    {row.durationSeconds
                      ? ` · ${Math.round(row.durationSeconds / 60)} phút`
                      : ' · không giới hạn giờ'}
                    {' · '}
                    {formatDate(row.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá bài thi “${row.name}”?`)) remove.mutate(row.id);
                    }}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
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
        <BlueprintDialog
          classroom={classroom}
          blueprint={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function BlueprintDialog({
  classroom,
  blueprint,
  onClose,
}: {
  classroom: Classroom;
  blueprint: TeacherBlueprint | null;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const queryClient = useQueryClient();

  const [name, setName] = useState(blueprint?.name ?? '');
  const [description, setDescription] = useState(blueprint?.description ?? '');
  const [componentId, setComponentId] = useState(blueprint?.componentId ?? '');
  const [mode, setMode] = useState<BlueprintSelectionMode>(blueprint?.selectionMode ?? 'FIXED');
  const [minutes, setMinutes] = useState(
    blueprint?.durationSeconds ? String(Math.round(blueprint.durationSeconds / 60)) : '',
  );
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [rules, setRules] = useState<BlueprintRule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const versions = useQuery({ queryKey: ['exam-versions'], queryFn: () => catalogApi.examVersions() });
  const versionId = versions.data?.[0]?.id ?? '';
  const components = useQuery({
    queryKey: ['components', versionId],
    queryFn: () => catalogApi.components(versionId),
    enabled: Boolean(versionId),
  });

  // Bài đủ 5 kỹ năng cần part của mọi kỹ năng; bài một kỹ năng chỉ cần part của nó.
  const componentIds = useMemo(
    () => (componentId ? [componentId] : (components.data ?? []).map((c) => c.id)),
    [componentId, components.data],
  );

  const parts = useQuery({
    queryKey: ['parts', 'multi', componentIds],
    queryFn: async () => {
      const groups = await Promise.all(componentIds.map((id) => catalogApi.parts(id)));
      return groups.flat();
    },
    enabled: componentIds.length > 0,
  });

  const ownSets = useQuery({
    queryKey: ['teacher', 'question-sets'],
    queryFn: teacherAuthoringApi.list,
  });

  // Nạp lại lựa chọn cũ khi mở bài đã có.
  const daLuu = useQuery({
    queryKey: ['teacher', 'blueprints', blueprint?.id, 'detail'],
    queryFn: async () => {
      const [sets, savedRules] = await Promise.all([
        teacherBlueprintApi.questionSets(blueprint!.id),
        teacherBlueprintApi.rules(blueprint!.id),
      ]);
      setSelectedSets(sets.map((s) => s.questionSetId));
      setRules(savedRules);
      return { sets, rules: savedRules };
    },
    enabled: Boolean(blueprint?.id),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        componentId: componentId || null,
        selectionMode: mode,
        durationSeconds: minutes.trim() === '' ? null : Number(minutes) * 60,
        ...(mode === 'FIXED' ? { questionSetIds: selectedSets } : { rules }),
      };
      return blueprint
        ? teacherBlueprintApi.update(blueprint.id, body)
        : teacherBlueprintApi.create(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher', 'blueprints'] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Không lưu được'),
  });

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError('Đặt tên cho bài thi trước khi lưu');
      return;
    }
    if (mode === 'FIXED' && selectedSets.length === 0) {
      setError('Chọn ít nhất một đề cho bài thi');
      return;
    }
    if (mode === 'RULES' && rules.length === 0) {
      setError('Thêm ít nhất một part vào luật bốc đề');
      return;
    }
    save.mutate();
  };

  const dangTai = versions.isPending || components.isPending
    || (Boolean(blueprint?.id) && daLuu.isPending);

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
          {blueprint ? 'Sửa bài thi' : 'Ghép bài thi cho lớp'}
        </h2>

        {dangTai ? (
          <LoadingBlock label="Đang tải…" />
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Tên bài thi
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Kiểm tra giữa kỳ — Reading"
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Mô tả (không bắt buộc)
              </span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Làm trong 30 phút, không tra từ điển"
                className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Phạm vi
                </span>
                <select
                  value={componentId}
                  onChange={(event) => {
                    setComponentId(event.target.value);
                    setSelectedSets([]);
                    setRules([]);
                  }}
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
                >
                  <option value="">Đủ 5 kỹ năng</option>
                  {(components.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      Full {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Thời gian (phút)
                </span>
                <input
                  value={minutes}
                  inputMode="numeric"
                  onChange={(event) => setMinutes(event.target.value)}
                  placeholder="Để trống = không giới hạn"
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400"
                />
              </label>
            </div>

            <div>
              <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Cách chọn đề
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['FIXED', 'Tôi chọn tay', 'Cả lớp làm cùng một bộ đề'],
                    ['RULES', 'Hệ thống bốc', 'Mỗi học viên ra đề khác nhau'],
                  ] as const
                ).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={clsx(
                      'flex-1 rounded-xl border px-3 py-2 text-left transition-colors',
                      mode === value
                        ? 'border-brand-600 bg-brand-50'
                        : 'border-border bg-white hover:bg-surface',
                    )}
                  >
                    <span
                      className={clsx(
                        'block text-sm font-semibold',
                        mode === value ? 'text-brand-800' : 'text-slate-700',
                      )}
                    >
                      {label}
                    </span>
                    <span className="block text-[11px] text-slate-500">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode === 'FIXED' ? (
              <FixedPicker
                classroom={classroom}
                parts={parts.data ?? []}
                ownSets={(ownSets.data ?? []).map((s) => ({
                  id: s.id,
                  title: s.title,
                  partId: s.partId ?? null,
                  hint: `${s.componentName} · ${s.partName} · đề của bạn`,
                }))}
                selected={selectedSets}
                onChange={setSelectedSets}
              />
            ) : (
              <RulesEditor parts={parts.data ?? []} rules={rules} onChange={setRules} />
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-2">
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
                onClick={submit}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {save.isPending ? 'Đang lưu…' : 'Lưu bài thi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Chọn tay từng đề, gom theo part cho dễ nhìn. */
function FixedPicker({
  classroom,
  parts,
  ownSets,
  selected,
  onChange,
}: {
  classroom: Classroom;
  parts: { id: string; name: string; componentCode: string }[];
  ownSets: { id: string; title: string; partId: string | null; hint: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [partId, setPartId] = useState('');

  const systemSets = useQuery({
    queryKey: ['parts', partId, 'question-sets'],
    queryFn: () => catalogApi.questionSets(partId, 0, 50),
    enabled: Boolean(partId) && classroom.systemContentEnabled,
  });

  const danhSach = useMemo(() => {
    const own = ownSets
      .filter((s) => !partId || s.partId === partId)
      .map((s) => ({ id: s.id, title: s.title, hint: s.hint }));
    const sys = (systemSets.data ?? []).map((s) => ({
      id: s.id,
      title: s.title ?? s.code,
      hint: 'đề hệ thống',
    }));
    return [...own, ...sys];
  }, [ownSets, partId, systemSets.data]);

  const toggle = (id: string, checked: boolean) =>
    onChange(checked ? [...selected, id] : selected.filter((x) => x !== id));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Chọn đề ({selected.length} đã chọn)
        </span>
        <select
          value={partId}
          onChange={(event) => setPartId(event.target.value)}
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs outline-none focus:border-brand-400"
        >
          <option value="">— Lọc theo part —</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {!classroom.systemContentEnabled && (
        <p className="mb-1.5 rounded-xl bg-surface-paper px-3 py-2 text-[11px] leading-5 text-slate-600">
          Lớp chưa mở kho đề hệ thống nên chỉ chọn được đề bạn tự soạn.
        </p>
      )}

      {danhSach.length === 0 ? (
        <p className="rounded-xl bg-surface-paper px-3 py-2.5 text-xs text-slate-600">
          {partId
            ? 'Không có đề nào ở part này.'
            : 'Chọn part ở trên để thấy đề, hoặc soạn đề riêng ở tab Đề của tôi.'}
        </p>
      ) : (
        <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          {danhSach.map((set) => (
            <label
              key={set.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface"
            >
              <input
                type="checkbox"
                checked={selected.includes(set.id)}
                onChange={(event) => toggle(set.id, event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-800">{set.title}</span>
                <span className="block text-[11px] text-slate-500">{set.hint}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Đặt luật cho hệ thống bốc đề: mỗi part một dòng. */
function RulesEditor({
  parts,
  rules,
  onChange,
}: {
  parts: { id: string; name: string }[];
  rules: BlueprintRule[];
  onChange: (rules: BlueprintRule[]) => void;
}) {
  const themPart = (partId: string) => {
    if (!partId || rules.some((r) => r.partId === partId)) return;
    onChange([...rules, { partId, questionSetCount: 1, difficultyMin: null, difficultyMax: null }]);
  };

  const sua = (partId: string, patch: Partial<BlueprintRule>) =>
    onChange(rules.map((r) => (r.partId === partId ? { ...r, ...patch } : r)));

  const ten = (partId: string) => parts.find((p) => p.id === partId)?.name ?? partId;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Luật bốc đề ({rules.length} part)
        </span>
        <select
          value=""
          onChange={(event) => themPart(event.target.value)}
          className="rounded-lg border border-border px-2.5 py-1.5 text-xs outline-none focus:border-brand-400"
        >
          <option value="">+ Thêm part</option>
          {parts
            .filter((p) => !rules.some((r) => r.partId === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>

      {rules.length === 0 ? (
        <p className="rounded-xl bg-surface-paper px-3 py-2.5 text-xs text-slate-600">
          Chưa có part nào. Thêm part rồi đặt số đề cần bốc cho mỗi part.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rules.map((rule) => (
            <li
              key={rule.partId}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                {ten(rule.partId)}
              </span>
              <label className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Số đề</span>
                <input
                  value={rule.questionSetCount}
                  inputMode="numeric"
                  onChange={(event) =>
                    sua(rule.partId, { questionSetCount: Number(event.target.value) || 1 })
                  }
                  className="w-14 rounded-lg border border-border px-2 py-1 text-sm outline-none focus:border-brand-400"
                />
              </label>
              <button
                type="button"
                onClick={() => onChange(rules.filter((r) => r.partId !== rule.partId))}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Bỏ
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
