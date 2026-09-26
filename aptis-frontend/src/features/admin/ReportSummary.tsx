import { useQuery } from '@tanstack/react-query';
import { adminReportApi } from '@/api/adminEndpoints';
import { skillByCode } from '@/lib/skills';
import { stagger } from '@/lib/motion';

/** Rút gọn tiền theo kiểu mock: 4.200.000 → "4,2tr". */
function shortMoney(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}tr`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(amount);
}

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Phần số liệu đầu trang Báo cáo theo mock: 4 ô KPI tháng này, cột doanh thu
 * 7 ngày và lượt làm bài theo kỹ năng 30 ngày.
 */
export function ReportSummary() {
  const query = useQuery({ queryKey: ['admin', 'reports', 'summary'], queryFn: adminReportApi.summary, staleTime: 60_000 });
  const data = query.data;
  if (query.isError) return null;

  const kpis = [
    { label: `Doanh thu tháng ${data?.month ?? ''}`, value: data ? `${data.monthRevenue.toLocaleString('vi-VN')}đ` : '–' },
    { label: 'Đơn thanh toán thành công', value: data ? data.paidOrders.toLocaleString('vi-VN') : '–' },
    { label: 'Học viên mới', value: data ? data.newUsers.toLocaleString('vi-VN') : '–' },
    { label: 'Bài chấm Writing/Speaking', value: data ? data.evaluations.toLocaleString('vi-VN') : '–' },
  ];
  const maxDay = Math.max(1, ...(data?.revenue7d ?? []).map((d) => d.amount));
  const maxSkill = Math.max(1, ...(data?.attemptsBySkill30d ?? []).map((s) => s.count));

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className="animate-in rounded-2xl border border-border bg-white px-4 py-3.5" style={stagger(i)}>
            <p className="text-[13px] text-ink-mute">{kpi.label}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-ink">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="animate-in rounded-2xl border border-border bg-white p-4" style={stagger(4)}>
          <h2 className="text-[15px] font-bold text-ink">Doanh thu 7 ngày</h2>
          <div className="mt-4 flex h-44 items-end gap-2.5">
            {(data?.revenue7d ?? []).map((day, i) => (
              <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] tabular-nums text-ink-mute">{day.amount ? shortMoney(day.amount) : ''}</span>
                <span
                  className="w-full origin-bottom animate-grow-y rounded-md bg-ink"
                  style={{ height: `${Math.max(2, (day.amount / maxDay) * 100)}%`, ...stagger(i, 60) }}
                  title={`${day.amount.toLocaleString('vi-VN')}đ`}
                />
                <span className="text-[11px] text-ink-faint">{WEEKDAY[new Date(`${day.date}T00:00:00`).getDay()]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="animate-in rounded-2xl border border-border bg-white p-4" style={stagger(5)}>
          <h2 className="text-[15px] font-bold text-ink">Lượt làm bài theo kỹ năng · 30 ngày</h2>
          {data && data.attemptsBySkill30d.length === 0 ? (
            <p className="mt-4 text-sm text-ink-mute">Chưa có lượt làm bài nào trong 30 ngày qua.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {(data?.attemptsBySkill30d ?? []).map((s, i) => {
                const skill = skillByCode(s.componentCode);
                return (
                  <li key={s.componentCode}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-ink">{skill.nameEn}</span>
                      <span className="font-semibold tabular-nums text-ink">{s.count.toLocaleString('vi-VN')}</span>
                    </div>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <span
                        className="block h-full origin-left animate-grow-x rounded-full"
                        style={{ width: `${(s.count / maxSkill) * 100}%`, background: skill.fg, ...stagger(i, 70) }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
