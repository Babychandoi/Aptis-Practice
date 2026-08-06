import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import clsx from 'clsx';
import { ApiError } from '@/api/client';
import { adminContentApi } from '@/api/adminEndpoints';
import { catalogApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatDateTime } from '@/lib/format';
import { PageHeader, Pager, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';
import type { AccessLevel, AdminQuestionSet, ContentStatus } from '@/types/admin';
import type { ComponentSummary, PageResponse, PartSummary } from '@/types/api';

const PAGE_SIZE = 12;

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'IN_REVIEW', label: 'Chờ duyệt' },
  { value: 'CHANGES_REQUESTED', label: 'Cần sửa' },
  { value: 'PUBLISHED', label: 'Đã phát hành' },
  { value: 'SUSPENDED', label: 'Tạm ẩn' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
];

const ACCESS_LABELS: Record<AccessLevel, string> = { FREE: 'Miễn phí', PREMIUM: 'Premium' };
const COMPONENT_META: Record<string, { icon: string; color: string }> = {
  GRAMMAR_VOCABULARY: { icon: 'Aa', color: 'bg-sky-50 text-sky-700' },
  READING: { icon: 'R', color: 'bg-emerald-50 text-emerald-700' },
  LISTENING: { icon: 'L', color: 'bg-amber-50 text-amber-700' },
  SPEAKING: { icon: 'S', color: 'bg-rose-50 text-rose-700' },
  WRITING: { icon: 'W', color: 'bg-violet-50 text-violet-700' },
};

export function QuestionSetListPage() {
  const { componentId, partId } = useParams<{ componentId?: string; partId?: string }>();
  const navigate = useNavigate();
  const versionsQuery = useQuery({ queryKey: ['exam-versions'], queryFn: () => catalogApi.examVersions() });
  const versionId = versionsQuery.data?.[0]?.id ?? '';
  const componentsQuery = useQuery({
    queryKey: ['components', versionId],
    queryFn: () => catalogApi.components(versionId),
    enabled: Boolean(versionId),
  });
  const selectedComponent = componentsQuery.data?.find((component) => component.id === componentId);
  const partsQuery = useQuery({
    queryKey: ['parts', componentId],
    queryFn: () => catalogApi.parts(componentId ?? ''),
    enabled: Boolean(componentId),
  });
  const selectedPart = partsQuery.data?.find((part) => part.id === partId);

  if (versionsQuery.isPending || componentsQuery.isPending) return <LoadingBlock label="Đang tải ngân hàng câu hỏi…" />;
  if (versionsQuery.error || componentsQuery.error) return <ErrorBlock message="Không tải được danh sách kỹ năng." onRetry={() => void componentsQuery.refetch()} />;

  if (!componentId) {
    return <SkillScreen components={componentsQuery.data ?? []} onSelect={(id) => navigate(`/admin/question-sets/skills/${id}`)} />;
  }
  if (!selectedComponent) return <ErrorBlock message="Kỹ năng không tồn tại." onRetry={() => navigate('/admin/question-sets')} />;
  if (partsQuery.isPending) return <LoadingBlock label={`Đang tải các Part của ${selectedComponent.name}…`} />;
  if (partsQuery.error) return <ErrorBlock message="Không tải được danh sách Part." onRetry={() => void partsQuery.refetch()} />;

  if (!partId) {
    return <PartScreen component={selectedComponent} parts={partsQuery.data ?? []} onSelect={(id) => navigate(`/admin/question-sets/skills/${componentId}/parts/${id}`)} />;
  }
  if (!selectedPart) return <ErrorBlock message="Part không tồn tại trong kỹ năng đã chọn." onRetry={() => navigate(`/admin/question-sets/skills/${componentId}`)} />;
  return <TestScreen component={selectedComponent} part={selectedPart} />;
}

function SkillScreen({ components, onSelect }: { components: ComponentSummary[]; onSelect: (id: string) => void }) {
  return (
    <div>
      <PageHeader title="Ngân hàng câu hỏi" description="Chọn một kỹ năng để xem các Part bên trong." />
      <Breadcrumb items={['Ngân hàng', 'Kỹ năng']} />
      <section className="rounded-2xl border border-[#e5e1d7] bg-white p-5 shadow-[0_4px_18px_rgba(31,41,35,.05)] sm:p-7">
        <LevelHeader number="1" title="Chọn kỹ năng" description={`${components.length} nhóm nội dung trong ngân hàng câu hỏi`} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {components.map((component) => {
            const meta = COMPONENT_META[component.code] ?? { icon: component.name.charAt(0), color: 'bg-stone-100 text-stone-700' };
            return <button key={component.id} type="button" onClick={() => onSelect(component.id)} className="group flex min-h-32 items-center gap-4 rounded-2xl border border-stone-200 p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-50 hover:shadow-md"><span className={clsx('grid h-14 w-14 shrink-0 place-items-center rounded-xl text-lg font-bold', meta.color)}>{meta.icon}</span><span className="min-w-0 flex-1"><span className="block text-lg font-semibold text-slate-900 group-hover:text-brand-900">{component.name}</span><span className="mt-1 block text-sm text-slate-500">Xem danh sách Part</span></span><span className="text-xl text-slate-300 group-hover:translate-x-1 group-hover:text-brand-700">→</span></button>;
          })}
        </div>
      </section>
    </div>
  );
}

function PartScreen({ component, parts, onSelect }: { component: ComponentSummary; parts: PartSummary[]; onSelect: (id: string) => void }) {
  const navigate = useNavigate();
  return (
    <div>
      <PageHeader title={component.name} description="Chọn một Part để mở danh sách đề." actions={<button type="button" className="btn-secondary" onClick={() => navigate('/admin/question-sets')}>← Đổi kỹ năng</button>} />
      <Breadcrumb items={['Ngân hàng', component.name, 'Chọn Part']} onBack={() => navigate('/admin/question-sets')} />
      <section className="rounded-2xl border border-[#e5e1d7] bg-white p-5 shadow-[0_4px_18px_rgba(31,41,35,.05)] sm:p-7">
        <LevelHeader number="2" title="Chọn Part" description={`${component.name} có ${parts.length} Part`} />
        {parts.length === 0 ? <EmptyMessage title="Kỹ năng này chưa có Part" description="Cần cấu hình Part trước khi thêm đề." /> : <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{parts.map((part, index) => <button key={part.id} type="button" onClick={() => onSelect(part.id)} className="group flex min-h-32 items-center gap-4 rounded-2xl border border-stone-200 p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-50 hover:shadow-md"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eef7f3] text-sm font-bold text-brand-800">{index + 1}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Part {index + 1}</span><span className="mt-1 block text-base font-semibold text-slate-900 group-hover:text-brand-900">{part.name}</span><span className="mt-1 block text-xs text-slate-500">Xem danh sách đề</span></span><span className="text-xl text-slate-300 group-hover:translate-x-1 group-hover:text-brand-700">→</span></button>)}</div>}
      </section>
    </div>
  );
}

function TestScreen({ component, part }: { component: ComponentSummary; part: PartSummary }) {
  const navigate = useNavigate();
  const { has } = usePermission();
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(searchInput.trim()); setPage(0); }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: ['admin', 'question-sets', part.id, status, debouncedSearch, page],
    queryFn: () => adminContentApi.search({ partId: part.id, status: status || undefined, q: debouncedSearch || undefined, page, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });
  const hierarchyQuery = `componentId=${component.id}&partId=${part.id}`;
  const createUrl = `/admin/question-sets/new?${hierarchyQuery}`;

  return (
    <div>
      <PageHeader title={part.name} description={`${component.name} · Quản lý các đề và câu hỏi trong Part này.`} actions={<div className="flex gap-2"><button type="button" className="btn-secondary" onClick={() => navigate(`/admin/question-sets/skills/${component.id}`)}>← Đổi Part</button>{has('question_set:write') && <button type="button" className="btn-primary" onClick={() => navigate(createUrl)}>+ Tạo đề mới</button>}</div>} />
      <Breadcrumb items={['Ngân hàng', component.name, part.name, 'Danh sách đề']} onBack={() => navigate(`/admin/question-sets/skills/${component.id}`)} />
      <section className="rounded-2xl border border-[#e5e1d7] bg-white p-5 shadow-[0_4px_18px_rgba(31,41,35,.05)] sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4"><LevelHeader number="3" title="Danh sách đề" description="Mở một đề để xem câu hỏi, lựa chọn và đáp án đúng" /><div className="flex w-full flex-wrap gap-2 lg:w-auto"><select aria-label="Lọc trạng thái đề" className="input min-w-44 !py-2" value={status} onChange={(event) => { setStatus(event.target.value as ContentStatus | ''); setPage(0); }}><option value="">Tất cả trạng thái</option>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><input aria-label="Tìm đề" type="search" className="input min-w-64 flex-1 !py-2" placeholder="Tìm theo mã hoặc tên đề" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div></div>
        <div className="mt-5"><QuestionSetGrid query={listQuery} onOpen={(id) => navigate(`/admin/question-sets/${id}?${hierarchyQuery}`)} onCreate={() => navigate(createUrl)} canCreate={has('question_set:write')} /></div>
        {listQuery.data && <Pager page={page} totalPages={listQuery.data.totalPages} onChange={setPage} />}
      </section>
    </div>
  );
}

function QuestionSetGrid({ query, onOpen, onCreate, canCreate }: { query: UseQueryResult<PageResponse<AdminQuestionSet>, Error>; onOpen: (id: string) => void; onCreate: () => void; canCreate: boolean }) {
  if (query.isPending) return <LoadingBlock label="Đang tải danh sách đề…" />;
  if (query.error || !query.data) return <ErrorBlock message={query.error instanceof ApiError ? query.error.message : 'Không tải được danh sách đề.'} onRetry={() => void query.refetch()} />;
  if (query.data.content.length === 0) return <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-xl text-brand-800">□</span><h3 className="mt-3 font-semibold text-slate-900">Part này chưa có đề</h3><p className="mt-1 text-sm text-slate-500">Tạo đề đầu tiên, sau đó thêm câu hỏi, lựa chọn và đáp án theo từng bước.</p>{canCreate && <button type="button" className="btn-primary mt-4" onClick={onCreate}>+ Tạo đề cho Part này</button>}</div>;
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{query.data.content.map((questionSet) => <button key={questionSet.id} type="button" onClick={() => onOpen(questionSet.id)} className="group rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-[0_3px_14px_rgba(31,41,35,.05)] transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md"><div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-brand-50 px-2 py-1 font-mono text-[11px] font-semibold text-brand-800">{questionSet.code}</span><StatusBadge status={questionSet.status} /></div><h3 className="mt-4 line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-brand-800">{questionSet.title || 'Đề chưa đặt tên'}</h3><p className="mt-1 text-xs text-slate-500">{questionSet.taskTypeCode.replaceAll('_', ' ')} · {questionSet.topicName || 'Chưa có chủ đề'}</p><div className="mt-4 grid grid-cols-3 border-t border-stone-100 pt-3 text-xs"><Meta label="Câu hỏi" value={String(questionSet.itemCount)} /><Meta label="Truy cập" value={ACCESS_LABELS[questionSet.accessLevel]} /><Meta label="Cập nhật" value={formatDateTime(questionSet.updatedAt)} /></div><span className="mt-4 flex items-center justify-end text-xs font-semibold text-brand-800">Xem câu hỏi và đáp án →</span></button>)}</div>;
}

function Breadcrumb({ items, onBack }: { items: string[]; onBack?: () => void }) { return <nav className="mb-5 flex items-center gap-2 overflow-x-auto text-xs text-slate-500" aria-label="Vị trí trong ngân hàng câu hỏi">{onBack && <button type="button" onClick={onBack} className="mr-1 font-semibold text-brand-800 hover:underline">←</button>}{items.map((item, index) => <span key={`${item}-${index}`} className="flex items-center gap-2 whitespace-nowrap"><span className={index === items.length - 1 ? 'font-semibold text-brand-800' : ''}>{item}</span>{index < items.length - 1 && <span aria-hidden="true">›</span>}</span>)}</nav>; }
function LevelHeader({ number, title, description }: { number: string; title: string; description: string }) { return <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-800 text-sm font-bold text-white">{number}</span><div><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{description}</p></div></div>; }
function EmptyMessage({ title, description }: { title: string; description: string }) { return <div className="mt-5 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center"><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>; }
function Meta({ label, value }: { label: string; value: string }) { return <span className="min-w-0 pr-2"><span className="block text-[10px] uppercase tracking-wide text-slate-400">{label}</span><span className="mt-0.5 block truncate font-medium text-slate-700">{value}</span></span>; }
