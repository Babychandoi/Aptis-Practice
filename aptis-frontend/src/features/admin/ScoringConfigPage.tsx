import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminScoringApi } from '@/api/adminEndpoints';
import { ApiError } from '@/api/client';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import type { PartScoringRule } from '@/types/admin';
import { PageHeader, ResultBanner } from './components/AdminUi';
import { usePermission } from './usePermission';

const QUERY_KEY = ['admin', 'scoring-rules'];

export function ScoringConfigPage() {
  const { has } = usePermission();
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<PartScoringRule[]>([]);
  const [saved, setSaved] = useState(false);
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: adminScoringApi.list });

  useEffect(() => { if (query.data) setRules(query.data); }, [query.data]);

  const groups = useMemo(() => {
    const result = new Map<string, PartScoringRule[]>();
    rules.forEach((rule) => result.set(rule.componentCode, [...(result.get(rule.componentCode) ?? []), rule]));
    return [...result.entries()];
  }, [rules]);
  const totals = useMemo(() => new Map(groups.map(([code, items]) =>
    [code, items.reduce((sum, item) => sum + Number(item.maxScore || 0), 0)])), [groups]);
  const overall = rules.filter((rule) => rule.includedInOverall)
    .reduce((sum, rule) => sum + Number(rule.maxScore || 0), 0);
  const valid = groups.length > 0 && [...totals.values()].every((total) => Math.abs(total - 50) < 0.001)
    && Math.abs(overall - 200) < 0.001;

  const mutation = useMutation({
    mutationFn: () => adminScoringApi.update(rules.map((rule) => ({
      id: rule.id,
      maxScore: Number(rule.maxScore),
      pointsPerCorrect: rule.pointsPerCorrect === null ? null : Number(rule.pointsPerCorrect),
      perfectBonus: Number(rule.perfectBonus),
    }))),
    onSuccess: (data) => {
      setRules(data);
      setSaved(true);
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });

  if (query.isPending) return <LoadingBlock label="Đang tải thang điểm…" />;
  if (query.error) return <ErrorBlock message="Không tải được cấu hình điểm." onRetry={() => void query.refetch()} />;

  const update = (id: string, field: 'maxScore' | 'pointsPerCorrect' | 'perfectBonus', value: string) => {
    setSaved(false);
    setRules((current) => current.map((rule) => rule.id === id
      ? { ...rule, [field]: field === 'pointsPerCorrect' && value === '' ? null : Number(value) }
      : rule));
  };

  return <div>
    <PageHeader
      title="Cấu hình điểm"
      description="Thang điểm Aptis General theo từng kỹ năng và Part. Mỗi kỹ năng có tối đa 50 điểm; Overall chỉ tính Nghe, Nói, Đọc và Viết."
      actions={<button type="button" className="btn-primary" disabled={!valid || mutation.isPending || !has('question_set:write')} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}
      </button>}
    />
    {saved && <ResultBanner tone="success" message="Đã cập nhật thang điểm. Bộ câu hỏi tạo hoặc lưu tiếp theo sẽ dùng cấu hình mới." onDismiss={() => setSaved(false)} />}
    {mutation.error && <ResultBanner tone="danger" message={mutation.error instanceof ApiError ? mutation.error.message : 'Không lưu được cấu hình điểm.'} />}
    {!valid && <ResultBanner tone="warn" message="Mỗi kỹ năng phải đủ 50 điểm và tổng Overall của 4 kỹ năng phải bằng 200 điểm." />}

    <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Tổng quan thang điểm">
      <ScoreSummary label="Mỗi kỹ năng" value="50" note="điểm tối đa" />
      <ScoreSummary label="Overall" value={formatScore(overall)} note="/ 200 điểm" valid={Math.abs(overall - 200) < 0.001} />
      <ScoreSummary label="Core" value="Không tính" note="Ngữ pháp & Từ vựng" />
    </section>

    <div className="grid gap-5 xl:grid-cols-2">
      {groups.map(([componentCode, items]) => {
        const total = totals.get(componentCode) ?? 0;
        return <section key={componentCode} className="overflow-hidden rounded-2xl border border-[#dedbd1] bg-white shadow-[0_4px_18px_rgba(31,41,35,.06)]">
          <header className="flex items-center justify-between border-b border-[#ebe8df] bg-[#f8f7f2] px-5 py-4">
            <div><h2 className="text-base font-bold text-stone-900">{items[0]?.componentName}</h2><p className="mt-0.5 text-xs text-stone-500">{items[0]?.includedInOverall ? 'Tính vào Overall' : 'Không tính vào Overall'}</p></div>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${Math.abs(total - 50) < .001 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>{formatScore(total)} / 50</span>
          </header>
          <div className="divide-y divide-[#efede7]">
            {items.map((rule) => <div key={rule.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(150px,1fr)_110px_125px_110px] md:items-end">
              <div><p className="font-semibold text-stone-900">{rule.partName}</p><p className="mt-1 text-xs text-stone-500">{description(rule)}</p></div>
              <NumberField label="Điểm Part" value={rule.maxScore} onChange={(value) => update(rule.id, 'maxScore', value)} />
              <NumberField label="Mỗi đáp án đúng" value={rule.pointsPerCorrect} optional onChange={(value) => update(rule.id, 'pointsPerCorrect', value)} />
              <NumberField label="Thưởng trọn bộ" value={rule.perfectBonus} onChange={(value) => update(rule.id, 'perfectBonus', value)} />
            </div>)}
          </div>
        </section>;
      })}
    </div>
    <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Lưu ý: “Điểm mỗi đáp án đúng” dùng cho phần chấm tự động. Speaking và Writing được chấm theo rubric nên để trống. Reading Part 3 có thêm 2 điểm khi đúng đủ cả 7 câu.</p>
  </div>;
}

function NumberField({ label, value, optional, onChange }: { label: string; value: number | null; optional?: boolean; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-stone-600">{label}
    <input aria-label={label} type="number" min="0" step="0.5" value={value ?? ''} placeholder={optional ? 'Rubric' : '0'} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100" />
  </label>;
}

function ScoreSummary({ label, value, note, valid = true }: { label: string; value: string; note: string; valid?: boolean }) {
  return <div className="rounded-xl border border-[#dedbd1] bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p><p className={`mt-1 text-2xl font-bold ${valid ? 'text-brand-900' : 'text-red-700'}`}>{value}</p><p className="text-xs text-stone-500">{note}</p></div>;
}

function formatScore(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function description(rule: PartScoringRule) {
  if (rule.componentCode === 'READING' && rule.partCode === 'PART_3') return '7 câu × 2 điểm + 2 điểm đúng trọn bộ';
  if (rule.pointsPerCorrect) return `${formatScore(rule.pointsPerCorrect)} điểm cho mỗi đáp án đúng`;
  return 'Chấm theo rubric của kỹ năng';
}
