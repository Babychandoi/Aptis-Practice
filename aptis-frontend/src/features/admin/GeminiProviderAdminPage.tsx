import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminGeminiApi } from '@/api/adminEndpoints';
import { ApiError } from '@/api/client';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import type { GeminiProvider, SaveGeminiProviderRequest } from '@/types/admin';
import { DataTable, PageHeader, ResultBanner, StatusBadge } from './components/AdminUi';

const KEY = ['admin', 'gemini-providers'];
const emptyForm: SaveGeminiProviderRequest = { name: '', projectId: '', apiKey: '', enabled: true, priority: 100, maxConcurrent: 10 };

export function GeminiProviderAdminPage() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: adminGeminiApi.list });
  const [editing, setEditing] = useState<GeminiProvider | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => editing === 'new' ? adminGeminiApi.create(form) : adminGeminiApi.update((editing as GeminiProvider).id, form),
    onSuccess: () => { void client.invalidateQueries({ queryKey: KEY }); setEditing(null); setNotice('Đã lưu Gemini project. API key được mã hóa trước khi ghi database.'); },
  });
  const test = useMutation({ mutationFn: adminGeminiApi.test, onSuccess: (r) => { void client.invalidateQueries({ queryKey: KEY }); setNotice(r.message); } });

  const openEdit = (provider: GeminiProvider) => {
    setEditing(provider);
    setForm({ name: provider.name, projectId: provider.projectId ?? '', apiKey: '', enabled: provider.enabled, priority: provider.priority, maxConcurrent: provider.maxConcurrent });
  };
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };
  const error = save.error || test.error;

  return <div>
    <PageHeader title="Gemini Live" description="Quản lý nhiều Google Cloud project/API key. Hệ thống ưu tiên project có priority thấp hơn, còn capacity và ít lỗi hơn." actions={<button className="btn-primary" onClick={() => { setEditing('new'); setForm(emptyForm); }}>Thêm project</button>} />
    {notice && <ResultBanner tone="success" message={notice} onDismiss={() => setNotice(null)} />}
    {error && <ResultBanner tone="danger" message={error instanceof ApiError ? error.message : 'Không thực hiện được thao tác'} />}
    {editing && <form onSubmit={submit} className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
      <label className="text-sm font-medium">Tên project<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label className="text-sm font-medium">Google project ID<input className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" maxLength={120} value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} /></label>
      <label className="text-sm font-medium sm:col-span-2">API key {editing !== 'new' && <span className="font-normal text-slate-500">(để trống để giữ key hiện tại)</span>}<input type="password" autoComplete="new-password" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono" required={editing === 'new'} value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} /></label>
      <label className="text-sm font-medium">Priority<input type="number" min={1} max={10000} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} /></label>
      <label className="text-sm font-medium">Nấc capacity benchmark<select className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" value={form.maxConcurrent} onChange={e => setForm({ ...form, maxConcurrent: Number(e.target.value) })}><option value={10}>10 phiên/project (khởi đầu)</option><option value={25}>25 phiên/project</option><option value={50}>50 phiên/project</option><option value={100}>100 phiên/project</option></select><span className="mt-1 block text-xs font-normal text-amber-700">Chỉ nâng 10 → 25 → 50 → 100 sau khi benchmark đạt yêu cầu; không suy concurrency từ TPM.</span></label>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> Cho phép cấp phiên mới</label>
      <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Hủy</button><button className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Đang lưu…' : 'Lưu project'}</button></div>
    </form>}
    {query.isPending ? <LoadingBlock label="Đang tải Gemini projects…" /> : query.error ? <ErrorBlock message="Không tải được Gemini projects" onRetry={() => void query.refetch()} /> : <DataTable headers={['Project', 'API key', 'Capacity', 'Sức khỏe', 'Trạng thái', '']} isEmpty={!query.data?.length} empty="Chưa có Gemini project. Hãy thêm ít nhất một API key để mở AI English Lounge.">
      {query.data?.map(p => <tr key={p.id} className="hover:bg-slate-50">
        <td className="px-4 py-3"><p className="font-semibold">{p.name}</p><p className="text-xs text-slate-500">{p.projectId || 'Chưa nhập project ID'} · priority {p.priority}</p></td>
        <td className="px-4 py-3 font-mono text-xs">{p.maskedKey}</td>
        <td className="px-4 py-3 text-sm">{p.activeSessions}/{p.maxConcurrent}</td>
        <td className="px-4 py-3 text-sm"><p className={p.consecutiveFailures ? 'text-red-700' : 'text-emerald-700'}>{p.consecutiveFailures ? `${p.consecutiveFailures} lỗi liên tiếp` : 'Bình thường'}</p>{p.lastError && <p className="max-w-xs truncate text-xs text-red-600" title={p.lastError}>{p.lastError}</p>}</td>
        <td className="px-4 py-3"><StatusBadge status={p.enabled ? 'ACTIVE' : 'INACTIVE'} /></td>
        <td className="whitespace-nowrap px-4 py-3 text-right"><button className="btn-ghost !px-2" onClick={() => test.mutate(p.id)} disabled={test.isPending}>Kiểm tra</button><button className="btn-ghost !px-2" onClick={() => openEdit(p)}>Sửa</button></td>
      </tr>)}
    </DataTable>}
  </div>;
}
