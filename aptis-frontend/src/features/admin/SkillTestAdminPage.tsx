import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminContentApi, adminSkillTestApi } from '@/api/adminEndpoints';
import { catalogApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import type { AccessLevel, SkillTestAssemblyMode } from '@/types/admin';
import { PageHeader, ResultBanner, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';

const QUERY_KEY = ['admin', 'skill-tests'];

export function SkillTestAdminPage() {
  const { has } = usePermission();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const list = useQuery({ queryKey: QUERY_KEY, queryFn: () => adminSkillTestApi.list() });
  const archive = useMutation({
    mutationFn: adminSkillTestApi.archive,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  if (!has('blueprint:write')) return <ErrorBlock message="Bạn không có quyền quản lý bài test." />;
  if (list.isPending) return <LoadingBlock label="Đang tải bài test kỹ năng…" />;
  if (list.error) return <ErrorBlock message="Không tải được danh sách bài test." onRetry={() => void list.refetch()} />;

  return <div>
    <PageHeader title="Bài test kỹ năng" description="Tạo bài hoàn chỉnh từ các bộ câu hỏi trong từng Part. Ngân hàng câu hỏi gốc không bị thay đổi."
      actions={<button type="button" className="btn-primary" onClick={() => setCreating((value) => !value)}>{creating ? 'Đóng' : '+ Tạo bài test'}</button>} />
    {creating && <CreateSkillTestWizard onDone={() => { setCreating(false); void queryClient.invalidateQueries({ queryKey: QUERY_KEY }); }} />}
    <div className="grid gap-4 lg:grid-cols-2">
      {(list.data ?? []).map((test) => <article key={test.id} className="rounded-2xl border border-[#dedbd1] bg-white p-5 shadow-[0_4px_16px_rgba(31,41,35,.06)]">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{test.componentName}</p><h2 className="mt-1 text-lg font-bold">{test.name}</h2><p className="mt-1 text-xs text-stone-500">{test.code}</p></div><StatusBadge status={test.status} /></div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-stone-100 px-3 py-1">{test.parts.length} Part</span><span className="rounded-full bg-stone-100 px-3 py-1">{test.durationSeconds ? `${Math.round(test.durationSeconds / 60)} phút` : 'Không giới hạn'}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{test.accessLevel}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{assemblyLabel(test.assemblyMode)}</span></div>
        <div className="mt-4 divide-y divide-stone-100 rounded-xl border border-stone-200">{test.parts.map((part) => <div key={part.partId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"><span className="font-medium">{part.partName}</span><span className="truncate text-xs text-stone-500">{part.selectionStrategy === 'RANDOM' ? 'Ngẫu nhiên mỗi lượt' : part.questionSetTitle || 'Đã chọn bộ đề'}</span></div>)}</div>
        {test.status !== 'ARCHIVED' && <button type="button" className="btn-ghost mt-4 text-red-700" disabled={archive.isPending} onClick={() => archive.mutate(test.id)}>Lưu trữ bài test</button>}
      </article>)}
    </div>
    {(list.data ?? []).length === 0 && <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">Chưa có bài test kỹ năng. Ngân hàng câu hỏi vẫn được quản lý riêng ở menu bên trên.</div>}
  </div>;
}

function CreateSkillTestWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [componentId, setComponentId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('35');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('PREMIUM');
  const [mode, setMode] = useState<SkillTestAssemblyMode>('FIXED');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const versions = useQuery({ queryKey: ['exam-versions'], queryFn: () => catalogApi.examVersions() });
  const components = useQuery({ queryKey: ['components', versions.data?.[0]?.id], queryFn: () => catalogApi.components(versions.data?.[0]?.id ?? ''), enabled: Boolean(versions.data?.[0]?.id) });
  const parts = useQuery({ queryKey: ['parts', componentId], queryFn: () => catalogApi.parts(componentId), enabled: Boolean(componentId) });
  const orderedParts = useMemo(() => [...(parts.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder), [parts.data]);
  const setQueries = useQueries({ queries: orderedParts.map((part) => ({ queryKey: ['admin', 'question-sets', part.id, 'published'], queryFn: () => adminContentApi.search({ partId: part.id, status: 'PUBLISHED', page: 0, size: 100 }), enabled: step === 2 && (mode === 'FIXED' || mode === 'BATCH_RANDOM') })) });

  useEffect(() => {
    if (!componentId && components.data?.[0]) setComponentId(components.data[0].id);
  }, [componentId, components.data]);

  const eligibleSets = setQueries.map((query) => (query.data?.content ?? []).filter((set) => accessLevel === 'PREMIUM' || set.accessLevel === 'FREE'));
  const batchCapacity = orderedParts.length > 0 && setQueries.every((query) => query.isSuccess)
    ? Math.min(...eligibleSets.map((sets) => sets.length))
    : 0;
  const create = useMutation({
    mutationFn: async () => mode === 'BATCH_RANDOM'
      ? adminSkillTestApi.createBatch({ componentId, accessLevel, durationSeconds: Number(duration) * 60 })
      : [await adminSkillTestApi.create({ componentId, code: code.trim(), name: name.trim(), description: description.trim() || undefined, accessLevel, durationSeconds: Number(duration) * 60, assemblyMode: mode, parts: orderedParts.map((part) => ({ partId: part.id, questionSetId: mode === 'FIXED' ? selected[part.id] : null })) })],
    onSuccess: onDone,
  });
  const canContinue = Boolean(componentId && Number(duration) > 0 && (mode === 'BATCH_RANDOM' || (code.trim() && name.trim())));
  const canSave = orderedParts.length > 0 && (mode === 'BATCH_RANDOM' ? batchCapacity > 0 : mode !== 'FIXED' || orderedParts.every((part) => selected[part.id]));

  return <section className="mb-6 rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-[0_8px_28px_rgba(31,41,35,.08)]">
    <div className="mb-5 grid grid-cols-2 gap-2"><Step number={1} label="Thông tin bài test" active={step === 1} done={step > 1} /><Step number={2} label="Ghép các Part" active={step === 2} done={false} /></div>
    {create.error && <ResultBanner tone="danger" message={create.error instanceof ApiError ? create.error.message : 'Không tạo được bài test.'} />}
    {step === 1 ? <div className="grid gap-4 md:grid-cols-2">
      <Field label="Kỹ năng"><select value={componentId} onChange={(e) => setComponentId(e.target.value)} className="form-input">{(components.data ?? []).map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}</select></Field>
      {mode === 'BATCH_RANDOM' ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-2"><strong className="text-sm text-brand-900">Tên và mã đề được đánh tự động</strong><p className="mt-1 text-xs leading-5 text-stone-600">Ví dụ: Reading Test 1, Reading Test 2… với mã đề 1, 2, 3…</p></div> : <>
        <Field label="Mã bài test"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="form-input" placeholder="READING_TEST_01" /></Field>
        <Field label="Tên bài test"><input value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Reading · Test 1" /></Field>
      </>}
      <Field label="Thời gian (phút)"><input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} className="form-input" /></Field>
      <Field label="Quyền truy cập"><select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value as AccessLevel)} className="form-input"><option value="PREMIUM">Premium</option><option value="FREE">Miễn phí</option></select></Field>
      <Field label="Mô tả"><input value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" placeholder="Mô tả ngắn cho học viên" /></Field>
      <div className="md:col-span-2"><p className="mb-2 text-sm font-semibold">Cách ghép đề</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{(['FIXED', 'GENERATED_RANDOM', 'DYNAMIC_RANDOM', 'BATCH_RANDOM'] as SkillTestAssemblyMode[]).map((value) => <button type="button" key={value} onClick={() => setMode(value)} className={`rounded-xl border p-4 text-left ${mode === value ? 'border-brand-800 bg-[#edf7f3] ring-1 ring-brand-800' : 'border-stone-200'}`}><strong className="block text-sm">{assemblyLabel(value)}</strong><span className="mt-1 block text-xs leading-5 text-stone-500">{assemblyHelp(value)}</span></button>)}</div></div>
      <div className="md:col-span-2 flex justify-end"><button type="button" className="btn-primary" disabled={!canContinue} onClick={() => setStep(2)}>Tiếp tục →</button></div>
    </div> : <div>
      <div className="mb-4 rounded-xl bg-[#edf7f3] px-4 py-3 text-sm text-brand-900">Bài hoàn chỉnh gồm đủ {orderedParts.length} Part. {assemblyHelp(mode)}{mode === 'BATCH_RANDOM' && batchCapacity > 0 ? ` Có thể tạo ${batchCapacity} đề.` : ''}</div>
      <div className="space-y-3">{orderedParts.map((part, index) => {
        const available = eligibleSets[index] ?? [];
        return <div key={part.id} className="grid gap-3 rounded-xl border border-stone-200 p-4 md:grid-cols-[220px_1fr] md:items-center"><div><p className="font-semibold">{part.name}</p><p className="text-xs text-stone-500">{part.publishedQuestionSetCount} bộ đã phát hành</p></div>{mode === 'FIXED' ? <select aria-label={`Bộ câu hỏi ${part.name}`} className="form-input" value={selected[part.id] ?? ''} onChange={(e) => setSelected((current) => ({ ...current, [part.id]: e.target.value }))}><option value="">Chọn bộ câu hỏi…</option>{available.map((set) => <option key={set.id} value={set.id}>{set.topicName ? `${set.topicName} · ` : ''}{set.title} ({set.accessLevel})</option>)}</select> : <div className="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">{mode === 'GENERATED_RANDOM' ? 'Hệ thống sẽ chọn ngẫu nhiên 1 bộ và lưu cố định.' : mode === 'BATCH_RANDOM' ? `${available.length} bộ phù hợp · mỗi bộ chỉ dùng một lần trong đợt ghép` : 'Mỗi lượt thi chọn ngẫu nhiên 1 bộ mới.'}</div>}</div>;
      })}</div>
      <div className="mt-5 flex justify-between"><button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Quay lại</button><button type="button" className="btn-primary" disabled={!canSave || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Đang tạo…' : mode === 'BATCH_RANDOM' ? `Tạo ${batchCapacity} đề hàng loạt` : mode === 'GENERATED_RANDOM' ? 'Ghép ngẫu nhiên & phát hành' : 'Tạo và phát hành'}</button></div>
    </div>}
  </section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-semibold text-stone-700">{label}<span className="mt-1.5 block">{children}</span></label>; }
function Step({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) { return <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${active ? 'bg-brand-900 text-white' : done ? 'bg-[#e8f4ef] text-brand-900' : 'bg-stone-100 text-stone-500'}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white/90 font-bold text-brand-900">{done ? '✓' : number}</span><strong className="text-sm">{label}</strong></div>; }
function assemblyLabel(mode: SkillTestAssemblyMode) { return mode === 'FIXED' ? 'Chọn thủ công' : mode === 'GENERATED_RANDOM' ? 'Ghép ngẫu nhiên cố định' : mode === 'BATCH_RANDOM' ? 'Ghép hàng loạt' : 'Ngẫu nhiên mỗi lượt'; }
function assemblyHelp(mode: SkillTestAssemblyMode) { return mode === 'FIXED' ? 'Bạn chọn chính xác một bộ câu hỏi cho từng Part.' : mode === 'GENERATED_RANDOM' ? 'Hệ thống bốc một bộ ở mỗi Part và lưu thành một đề cố định.' : mode === 'BATCH_RANDOM' ? 'Tạo số đề tối đa theo Part có ít bộ nhất, không lặp bộ trong cùng đợt.' : 'Khi học viên bắt đầu, hệ thống bốc lại một bộ ở mỗi Part.'; }
