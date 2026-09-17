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
  // Luyện một part cũng phải ghép thành bài thi, vì giao bài chỉ chọn bài ghép.
  // Nạp lại từ dữ liệu đã lưu ở useEffect bên dưới, không có cột riêng trong DB.
  const [partId, setPartId] = useState('');
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

  // Bài đang sửa chỉ có một part thì đó là bài luyện theo part; khôi phục lại
  // lựa chọn để giáo viên mở ra thấy đúng cái mình đã chọn.
  const [daNapPart, setDaNapPart] = useState(false);
  useEffect(() => {
    if (daNapPart || !blueprint || !daLuu.data) return;
    const cacPart = new Set(daLuu.data.rules.map((r) => r.partId));
    if (cacPart.size === 1 && blueprint.componentId) {
      const [dau] = [...cacPart];
      if (dau) setPartId(dau);
    }
    setDaNapPart(true);
  }, [blueprint, daLuu.data, daNapPart]);

  // Dựng lại các ô mỗi khi đổi phạm vi, và nạp lại lựa chọn cũ nếu đang sửa.
  useEffect(() => {
    if (!components.data || !parts.data) return;
    const next = buildSlots(components.data, parts.data, componentId, partId);
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
  }, [components.data, parts.data, componentId, partId, daLuu.data]);

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

  // Gợi ý thời lượng theo đề thật, giáo viên sửa được. Bài một part chia theo
  // tỷ lệ số đề trong kỹ năng, không lấy nguyên thời gian cả kỹ năng.
  const phutGoiY = useMemo(() => {
    if (!componentId) return FULL_TEST_MINUTES;
    const code = components.data?.find((c) => c.id === componentId)?.code ?? '';
    const caKyNang = SUGGESTED_MINUTES[code];
    if (!caKyNang) return null;
    if (!partId) return caKyNang;

    const cauTruc = SKILL_STRUCTURE[code] ?? [];
    const tongDe = cauTruc.reduce((sum, s) => sum + s.questionSetCount, 0);
    const deCuaPart = slots.reduce((sum, s) => sum + s.required, 0);
    if (!tongDe || !deCuaPart) return null;
    return Math.max(5, Math.round((caKyNang * deCuaPart) / tongDe));
  }, [componentId, partId, components.data, slots]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6"
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
                  onChange={(event) => {
                    setComponentId(event.target.value);
                    // Đổi kỹ năng thì part cũ không còn thuộc kỹ năng mới nữa.
                    setPartId('');
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

              {/* Luyện lẻ một part: giao bài chỉ chọn bài đã ghép nên muốn cho
                  lớp làm riêng một part cũng phải ghép ở đây. */}
              <label className={clsx('block', !componentId && 'opacity-50')}>
                <span className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Part
                </span>
                <select
                  value={partId}
                  disabled={!componentId}
                  onChange={(event) => setPartId(event.target.value)}
                  className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 disabled:cursor-not-allowed disabled:bg-surface-muted"
                >
                  <option value="">
                    {componentId ? 'Đủ các part' : 'Chọn một kỹ năng trước'}
                  </option>
                  {(parts.data ?? [])
                    .filter((p) => p.componentId === componentId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        Chỉ {p.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
  partId?: string,
): Omit<Slot, 'chosen'>[] {
  const codes = componentId
    ? [components.find((c) => c.id === componentId)?.code].filter(Boolean)
    : FULL_TEST_ORDER.filter((code) => components.some((c) => c.code === code));

  const tatCa = (codes as string[]).flatMap((code) => {
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

  // Luyện một part thì chỉ giữ đúng ô của part đó, số đề vẫn theo cấu trúc.
  return partId ? tatCa.filter((s) => s.partId === partId) : tatCa;
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
  // Mở popup riêng thay vì bung trong danh sách: danh sách đề dài, bung tại chỗ
  // thì ô cuộn chỉ cao hơn trăm pixel, nhìn được vài đề một lúc.
  const [dangChon, setDangChon] = useState<Slot | null>(null);
  const slotDangChon = dangChon
    ? slots.find((s) => s.partId === dangChon.partId) ?? null
    : null;

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
        <ul className="max-h-[42vh] space-y-1.5 overflow-y-auto rounded-xl border border-border p-2">
          {slots.map((slot) => (
            <SlotRow
              key={slot.partId}
              slot={slot}
              onOpen={() => setDangChon(slot)}
            />
          ))}
        </ul>
      )}

      {slotDangChon && (
        <SlotPickerDialog
          classroom={classroom}
          slot={slotDangChon}
          onChange={(chosen) =>
            onChange(
              slots.map((s) => (s.partId === slotDangChon.partId ? { ...s, chosen } : s)),
            )
          }
          onClose={() => setDangChon(null)}
        />
      )}
    </div>
  );
}

/** Một dòng trong danh sách cấu trúc: tóm tắt và nút mở popup chọn đề. */
function SlotRow({ slot, onOpen }: { slot: Slot; onOpen: () => void }) {
  const du = slot.chosen.length >= slot.required;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-2.5 rounded-lg border border-border-subtle px-2.5 py-2 text-left transition-colors hover:border-brand-300 hover:bg-surface"
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
        <span className="shrink-0 rounded-lg bg-brand-100 px-2.5 py-1.5 text-[11px] font-bold text-brand-800">
          Chọn đề
        </span>
      </button>
    </li>
  );
}

/**
 * Popup chọn đề cho một part.
 *
 * <p>Để riêng một popup rộng thay vì bung trong danh sách: có part cần chọn 25
 * đề, bung tại chỗ thì ô cuộn chỉ cao hơn trăm pixel, nhìn được vài đề một lúc.
 */
function SlotPickerDialog({
  classroom,
  slot,
  onChange,
  onClose,
}: {
  classroom: Classroom;
  slot: Slot;
  onChange: (chosen: string[]) => void;
  onClose: () => void;
}) {
  useEscapeKey(onClose);
  const [previewing, setPreviewing] = useState<{ id: string; title: string } | null>(null);
  const [tuKhoa, setTuKhoa] = useState('');

  const ownSets = useQuery({
    queryKey: ['teacher', 'question-sets'],
    queryFn: teacherAuthoringApi.list,
  });

  const systemSets = useQuery({
    queryKey: ['parts', slot.partId, 'question-sets'],
    queryFn: () => catalogApi.questionSets(slot.partId, 0, 200),
    enabled: classroom.systemContentEnabled,
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

  const hienThi = useMemo(() => {
    const q = tuKhoa.trim().toLowerCase();
    if (!q) return danhSach;
    return danhSach.filter((s) => s.title.toLowerCase().includes(q));
  }, [danhSach, tuKhoa]);

  const du = slot.chosen.length >= slot.required;
  const dangTai = ownSets.isPending || (classroom.systemContentEnabled && systemSets.isPending);

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      // Chọn quá số cấu trúc cho phép thì thay cái cũ nhất, không cộng dồn —
      // bài thi ra sai cấu trúc là học viên luyện sai.
      onChange([...slot.chosen, id].slice(-slot.required));
    } else {
      onChange(slot.chosen.filter((x) => x !== id));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-dark/50 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{slot.partName}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {slot.componentName} · cần {slot.required} đề
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={clsx(
                'rounded-full px-2.5 py-1 font-mono text-[11px] font-bold',
                du ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800',
              )}
            >
              {slot.chosen.length}/{slot.required}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-surface"
            >
              Xong
            </button>
          </div>
        </div>

        <div className="space-y-2.5 border-b border-border px-6 py-3">
          {!classroom.systemContentEnabled && (
            <p className="rounded-xl bg-surface-paper px-3 py-2 text-xs leading-5 text-slate-600">
              Lớp chưa mở kho đề hệ thống nên chỉ chọn được đề bạn tự soạn.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={tuKhoa}
              onChange={(event) => setTuKhoa(event.target.value)}
              placeholder="Tìm theo tên đề…"
              className="min-w-[200px] flex-1 rounded-xl border border-border px-3.5 py-2 text-sm outline-none focus:border-brand-400"
            />
            {/* Grammar cần 25 đề, Listening Part 1 cần 13 — tick tay từng cái
                thì không ai ngồi làm nổi, nên cho bốc nhanh rồi sửa lại. */}
            {slot.required > 3 && danhSach.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const tron = [...danhSach].sort(() => Math.random() - 0.5);
                  onChange(tron.slice(0, slot.required).map((s) => s.id));
                }}
                className="rounded-xl bg-brand-100 px-3 py-2 text-xs font-bold text-brand-800 transition-colors hover:bg-brand-200"
              >
                Bốc {slot.required} đề bất kỳ
              </button>
            )}
            {slot.chosen.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-surface"
              >
                Bỏ chọn hết
              </button>
            )}
          </div>

          {danhSach.length < slot.required && danhSach.length > 0 && (
            <p className="text-xs text-amber-700">
              Kho chỉ có {danhSach.length} đề ở part này, chưa đủ {slot.required}.
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {dangTai ? (
            <LoadingBlock label="Đang tải đề…" />
          ) : danhSach.length === 0 ? (
            <p className="rounded-xl bg-surface-paper px-3 py-3 text-sm leading-6 text-slate-600">
              Chưa có đề nào ở part này. Soạn đề ở tab <strong>Đề của tôi</strong> trước.
            </p>
          ) : hienThi.length === 0 ? (
            <p className="rounded-xl bg-surface-paper px-3 py-3 text-sm text-slate-600">
              Không có đề nào khớp “{tuKhoa.trim()}”.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {hienThi.map((set) => {
                const daChon = slot.chosen.includes(set.id);
                return (
                  <li key={set.id}>
                    <label
                      className={clsx(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                        daChon
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-border-subtle hover:bg-surface',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={daChon}
                        onChange={(event) => toggle(set.id, event.target.checked)}
                        className="h-4 w-4 shrink-0 rounded border-border"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-800">{set.title}</span>
                        <span className="block text-[11px] text-slate-500">{set.hint}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setPreviewing({ id: set.id, title: set.title });
                        }}
                        className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-surface"
                      >
                        Xem
                      </button>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
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
