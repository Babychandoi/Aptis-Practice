import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { catalogApi, teacherAuthoringApi, teacherBlueprintApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { formatDate } from '@/lib/format';
import { useEscapeKey } from '@/lib/useEscapeKey';
import { QuestionSetPreviewDialog } from '@/features/classroom/QuestionSetPreviewDialog';
import {
  FULL_TEST_MINUTES,
  FULL_TEST_ORDER,
  SKILL_STRUCTURE,
  SUGGESTED_MINUTES,
} from '@/features/classroom/blueprintStructure';
import type {
  BlueprintRule,
  BlueprintSelectionMode,
  Classroom,
  ComponentSummary,
  PartSummary,
  TeacherBlueprint,
} from '@/types/api';

/**
 * Bài thi giáo viên tự ghép cho lớp.
 *
 * <p>Hai mức: full một kỹ năng, hoặc đủ 5 kỹ năng. Cấu trúc bám đúng đề thi
 * thật — mỗi part cần bao nhiêu đề là cố định, không cho chọn tuỳ ý, vì học
 * viên luyện để thi thật.
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
          Ghép bài thi đúng cấu trúc Aptis: full một kỹ năng hoặc đủ 5 kỹ năng. Giao qua tab
          Bài giao.
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
                      if (window.confirm(`Xoá bài thi “${row.name}”?`)) remove.mutate(row.id);
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
        <BlueprintDialog
          classroom={classroom}
          blueprint={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** Một ô cần điền: part nào, cần mấy đề, đã chọn những đề nào. */
interface Slot {
  partId: string;
  partName: string;
  componentCode: string;
  componentName: string;
  required: number;
  chosen: string[];
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
  const [slots, setSlots] = useState<Slot[]>([]);
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

  const daLuu = useQuery({
    queryKey: ['teacher', 'blueprints', blueprint?.id, 'detail'],
    queryFn: async () => {
      const [sets, savedRules] = await Promise.all([
        teacherBlueprintApi.questionSets(blueprint!.id),
        teacherBlueprintApi.rules(blueprint!.id),
      ]);
      return { sets, rules: savedRules };
    },
    enabled: Boolean(blueprint?.id),
  });

  // Dựng lại các ô mỗi khi đổi phạm vi, và nạp lại lựa chọn cũ nếu đang sửa.
  useEffect(() => {
    if (!components.data || !parts.data) return;
    const next = buildSlots(components.data, parts.data, componentId);
    if (next.length === 0) return;

    const daChon = daLuu.data?.sets ?? [];
    setSlots(
      next.map((slot) => ({
        ...slot,
        chosen: daChon
          .filter((s) => s.partId === slot.partId)
          .slice(0, slot.required)
          .map((s) => s.questionSetId),
      })),
    );
  }, [components.data, parts.data, componentId, daLuu.data]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        componentId: componentId || null,
        selectionMode: mode,
        durationSeconds: minutes.trim() === '' ? null : Number(minutes) * 60,
        ...(mode === 'FIXED'
          ? { questionSetIds: slots.flatMap((s) => s.chosen) }
          : {
              rules: slots.map<BlueprintRule>((s) => ({
                partId: s.partId,
                questionSetCount: s.required,
                difficultyMin: null,
                difficultyMax: null,
              })),
            }),
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

  const conThieu = slots.filter((s) => s.chosen.length < s.required);
  const tongCanChon = slots.reduce((sum, s) => sum + s.required, 0);
  const tongDaChon = slots.reduce((sum, s) => sum + s.chosen.length, 0);

  const submit = () => {
    setError(null);
    if (!name.trim()) {
      setError('Đặt tên cho bài thi trước khi lưu');
      return;
    }
    if (mode === 'FIXED' && conThieu.length > 0) {
      setError(
        `Còn thiếu đề ở: ${conThieu
          .map((s) => `${s.partName} (${s.chosen.length}/${s.required})`)
          .join(', ')}`,
      );
      return;
    }
    save.mutate();
  };

  const dangTai = versions.isPending || components.isPending || parts.isPending
    || (Boolean(blueprint?.id) && daLuu.isPending);

  // Gợi ý thời lượng theo đề thật, giáo viên sửa được.
  const phutGoiY = componentId
    ? SUGGESTED_MINUTES[
        components.data?.find((c) => c.id === componentId)?.code ?? ''
      ] ?? null
    : FULL_TEST_MINUTES;

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
        <p className="mt-0.5 text-xs text-slate-500">
          Số đề mỗi part cố định theo cấu trúc đề thật — chọn đủ là lưu được.
        </p>

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
                  onChange={(event) => setComponentId(event.target.value)}
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
                  placeholder={phutGoiY ? `Đề thật: ${phutGoiY} phút` : 'Để trống = không giới hạn'}
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
              <SlotPicker
                classroom={classroom}
                slots={slots}
                onChange={setSlots}
                tongDaChon={tongDaChon}
                tongCanChon={tongCanChon}
              />
            ) : (
              <RulesSummary slots={slots} />
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

/**
 * Dựng danh sách ô cần điền theo cấu trúc chuẩn.
 *
 * <p>Part nào hệ thống chưa có thì bỏ qua thay vì dựng ô trống không chọn được.
 */
function buildSlots(
  components: ComponentSummary[],
  parts: PartSummary[],
  componentId: string,
): Omit<Slot, 'chosen'>[] {
  const codes = componentId
    ? [components.find((c) => c.id === componentId)?.code].filter(Boolean)
    : FULL_TEST_ORDER.filter((code) => components.some((c) => c.code === code));

  return (codes as string[]).flatMap((code) => {
    const component = components.find((c) => c.code === code);
    if (!component) return [];

    return (SKILL_STRUCTURE[code] ?? []).flatMap((slot) => {
      const part = parts.find(
        (p) => p.componentId === component.id && p.code === slot.partCode,
      );
      if (!part) return [];
      return [{
        partId: part.id,
        partName: part.name,
        componentCode: component.code,
        componentName: component.name,
        required: slot.questionSetCount,
      }];
    });
  });
}

/** Chọn đề cho từng ô, mỗi ô đúng số lượng cấu trúc yêu cầu. */
function SlotPicker({
  classroom,
  slots,
  onChange,
  tongDaChon,
  tongCanChon,
}: {
  classroom: Classroom;
  slots: Slot[];
  onChange: (slots: Slot[]) => void;
  tongDaChon: number;
  tongCanChon: number;
}) {
  const [moRong, setMoRong] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Chọn đề theo cấu trúc
        </span>
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 font-mono text-[10px] font-bold',
            tongDaChon === tongCanChon
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-800',
          )}
        >
          {tongDaChon}/{tongCanChon} đề
        </span>
      </div>

      {slots.length === 0 ? (
        <p className="rounded-xl bg-surface-paper px-3 py-2.5 text-xs text-slate-600">
          Đang dựng cấu trúc…
        </p>
      ) : (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
          {slots.map((slot) => (
            <SlotRow
              key={slot.partId}
              classroom={classroom}
              slot={slot}
              expanded={moRong === slot.partId}
              onToggle={() => setMoRong(moRong === slot.partId ? null : slot.partId)}
              onChange={(chosen) =>
                onChange(slots.map((s) => (s.partId === slot.partId ? { ...s, chosen } : s)))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SlotRow({
  classroom,
  slot,
  expanded,
  onToggle,
  onChange,
}: {
  classroom: Classroom;
  slot: Slot;
  expanded: boolean;
  onToggle: () => void;
  onChange: (chosen: string[]) => void;
}) {
  const [previewing, setPreviewing] = useState<{ id: string; title: string } | null>(null);

  const ownSets = useQuery({
    queryKey: ['teacher', 'question-sets'],
    queryFn: teacherAuthoringApi.list,
  });

  const systemSets = useQuery({
    queryKey: ['parts', slot.partId, 'question-sets'],
    queryFn: () => catalogApi.questionSets(slot.partId, 0, 50),
    enabled: expanded && classroom.systemContentEnabled,
  });

  const danhSach = useMemo(() => {
    const own = (ownSets.data ?? [])
      .filter((s) => s.partId === slot.partId)
      .map((s) => ({ id: s.id, title: s.title, hint: 'đề của bạn' }));
    const sys = (systemSets.data ?? []).map((s) => ({
      id: s.id,
      title: s.title ?? s.code,
      hint: 'đề hệ thống',
    }));
    return [...own, ...sys];
  }, [ownSets.data, systemSets.data, slot.partId]);

  const du = slot.chosen.length >= slot.required;

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      // Chọn quá số cấu trúc cho phép thì thay cái cũ nhất, không cộng dồn —
      // bài thi ra sai cấu trúc là học viên luyện sai.
      const next = [...slot.chosen, id];
      onChange(next.slice(-slot.required));
    } else {
      onChange(slot.chosen.filter((x) => x !== id));
    }
  };

  return (
    <li className="rounded-lg border border-border-subtle">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-surface"
      >
        <span
          className={clsx(
            'grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold',
            du ? 'bg-emerald-600 text-white' : 'bg-surface-muted text-slate-600',
          )}
        >
          {du ? '✓' : slot.chosen.length}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">
            {slot.partName}
          </span>
          <span className="block text-[11px] text-slate-500">
            cần {slot.required} đề · đã chọn {slot.chosen.length}
          </span>
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-brand-700">
          {expanded ? 'Thu gọn' : 'Chọn đề'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border-subtle px-2.5 py-2">
          {!classroom.systemContentEnabled && (
            <p className="mb-1.5 rounded-lg bg-surface-paper px-2.5 py-1.5 text-[11px] leading-5 text-slate-600">
              Lớp chưa mở kho đề hệ thống nên chỉ chọn được đề bạn tự soạn.
            </p>
          )}

          {/* Grammar cần 25 đề, Listening Part 1 cần 13 — tick tay từng cái thì
              không ai ngồi làm nổi, nên cho bốc nhanh rồi sửa lại nếu muốn. */}
          {slot.required > 3 && danhSach.length > 0 && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const tron = [...danhSach].sort(() => Math.random() - 0.5);
                  onChange(tron.slice(0, slot.required).map((s) => s.id));
                }}
                className="rounded-lg bg-brand-100 px-2.5 py-1.5 text-[11px] font-bold text-brand-800 hover:bg-brand-200"
              >
                Bốc {slot.required} đề bất kỳ
              </button>
              {slot.chosen.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-surface"
                >
                  Bỏ chọn hết
                </button>
              )}
              {danhSach.length < slot.required && (
                <span className="text-[11px] text-amber-700">
                  Kho chỉ có {danhSach.length} đề, chưa đủ {slot.required}
                </span>
              )}
            </div>
          )}

          {danhSach.length === 0 ? (
            <p className="rounded-lg bg-surface-paper px-2.5 py-2 text-[11px] text-slate-600">
              Chưa có đề nào ở part này. Soạn đề ở tab “Đề của tôi” trước.
            </p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {danhSach.map((set) => (
                <label
                  key={set.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-surface"
                >
                  <input
                    type="checkbox"
                    checked={slot.chosen.includes(set.id)}
                    onChange={(event) => toggle(set.id, event.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-border"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-800">{set.title}</span>
                    <span className="block text-[10px] text-slate-500">{set.hint}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      setPreviewing({ id: set.id, title: set.title });
                    }}
                    className="shrink-0 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-surface"
                  >
                    Xem
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {previewing && (
        <QuestionSetPreviewDialog
          questionSetId={previewing.id}
          title={previewing.title}
          onClose={() => setPreviewing(null)}
        />
      )}
    </li>
  );
}

/** Chế độ hệ thống bốc: chỉ cho xem cấu trúc, không cần chọn gì. */
function RulesSummary({ slots }: { slots: Slot[] }) {
  return (
    <div>
      <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
        Cấu trúc bài thi
      </span>
      <p className="mb-2 rounded-xl bg-surface-paper px-3 py-2 text-[11px] leading-5 text-slate-600">
        Hệ thống tự bốc đề theo đúng cấu trúc dưới đây, mỗi học viên một bộ khác nhau. Bạn
        không phải chọn gì thêm.
      </p>

      {slots.length === 0 ? (
        <p className="rounded-xl bg-surface-paper px-3 py-2.5 text-xs text-slate-600">
          Đang dựng cấu trúc…
        </p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
          {slots.map((slot) => (
            <li
              key={slot.partId}
              className="flex items-center justify-between gap-2 px-1.5 py-1"
            >
              <span className="min-w-0 truncate text-[13px] text-slate-800">{slot.partName}</span>
              <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-600">
                {slot.required} đề
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
