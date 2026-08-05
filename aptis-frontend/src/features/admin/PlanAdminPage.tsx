import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminPlanApi } from '@/api/adminEndpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatCurrency, planDurationLabel } from '@/lib/format';
import { DataTable, PageHeader, ResultBanner, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';
import type {
  AdminPlan,
  CreatePlanRequest,
  PlanStatus,
  UpdatePlanRequest,
} from '@/types/admin';

const PLAN_QUERY_KEY = ['admin', 'plans'];

const STATUS_OPTIONS: { value: PlanStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Nháp — chưa bán được' },
  { value: 'ACTIVE', label: 'Đang bán' },
  { value: 'INACTIVE', label: 'Ngừng bán' },
];

/** Thông báo lỗi từ API; các nguồn lỗi khác chỉ có câu chung. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function PlanAdminPage() {
  const queryClient = useQueryClient();
  const { has } = usePermission();
  const canWrite = has('plan:write');

  const [creating, setCreating] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: PLAN_QUERY_KEY,
    queryFn: () => adminPlanApi.list(),
  });

  const closeForms = () => {
    setCreating(false);
    setEditingPlan(null);
  };

  const createMutation = useMutation({
    mutationFn: (body: CreatePlanRequest) => adminPlanApi.create(body),
    onSuccess: (plan) => {
      void queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
      closeForms();
      setBanner(
        `Đã tạo gói "${plan.name}" ở trạng thái Nháp. Gói chưa hiển thị cho học viên` +
          ' — hãy sửa gói và đổi trạng thái sang "Đang bán" khi sẵn sàng.',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ planId, body }: { planId: string; body: UpdatePlanRequest }) =>
      adminPlanApi.update(planId, body),
    onSuccess: (plan) => {
      void queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEY });
      closeForms();
      setBanner(`Đã cập nhật gói "${plan.name}".`);
    },
  });

  const body = () => {
    if (plansQuery.isPending) {
      return <LoadingBlock label="Đang tải danh sách gói…" />;
    }

    if (plansQuery.error || !plansQuery.data) {
      return (
        <ErrorBlock
          message={errorMessage(plansQuery.error, 'Không tải được danh sách gói')}
          onRetry={() => void plansQuery.refetch()}
        />
      );
    }

    const plans = plansQuery.data;

    return (
      <DataTable
        headers={[
          'Mã',
          'Tên gói',
          'Thời hạn',
          'Giá',
          'Trạng thái',
          'Thứ tự hiển thị',
          '',
        ]}
        isEmpty={plans.length === 0}
        empty="Chưa có gói nào. Tạo gói đầu tiên để bắt đầu bán Premium."
      >
        {plans.map((plan) => (
          <tr key={plan.id} className="transition-colors hover:bg-brand-50">
            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-600">
              {plan.code}
            </td>
            <td className="px-4 py-2.5">
              <p className="font-medium text-slate-900">{plan.name}</p>
              {plan.description && (
                <p className="mt-0.5 text-xs text-slate-500">{plan.description}</p>
              )}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
              {planDurationLabel(plan.durationDays)}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
              {formatCurrency(plan.priceAmount, plan.currency)}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5">
              <StatusBadge status={plan.status} />
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
              {plan.displayOrder}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-right">
              {canWrite && (
                <button
                  type="button"
                  className="btn-ghost !px-3 !py-1 text-sm"
                  onClick={() => {
                    setCreating(false);
                    setBanner(null);
                    updateMutation.reset();
                    setEditingPlan(plan);
                  }}
                >
                  Sửa
                </button>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
    );
  };

  return (
    <div>
      <PageHeader
        title="Gói Premium"
        description="Quản lý danh mục gói bán cho học viên. Gói mới luôn ở trạng thái Nháp và chưa bán được."
        actions={
          canWrite && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setEditingPlan(null);
                setBanner(null);
                createMutation.reset();
                setCreating((open) => !open);
              }}
            >
              {creating ? 'Đóng biểu mẫu' : 'Tạo gói mới'}
            </button>
          )
        }
      />

      {banner && (
        <ResultBanner tone="success" message={banner} onDismiss={() => setBanner(null)} />
      )}

      {!canWrite && (
        <ResultBanner
          tone="info"
          message="Bạn chỉ có quyền xem. Cần quyền plan:write để tạo hoặc sửa gói."
        />
      )}

      {creating && canWrite && (
        <CreatePlanForm
          submitting={createMutation.isPending}
          error={
            createMutation.error
              ? errorMessage(createMutation.error, 'Không tạo được gói')
              : null
          }
          onCancel={() => setCreating(false)}
          onSubmit={(body) => createMutation.mutate(body)}
        />
      )}

      {editingPlan && canWrite && (
        <EditPlanForm
          key={editingPlan.id}
          plan={editingPlan}
          submitting={updateMutation.isPending}
          error={
            updateMutation.error
              ? errorMessage(updateMutation.error, 'Không cập nhật được gói')
              : null
          }
          onCancel={() => setEditingPlan(null)}
          onSubmit={(body) => updateMutation.mutate({ planId: editingPlan.id, body })}
        />
      )}

      {body()}
    </div>
  );
}

function CreatePlanForm({
  submitting,
  error,
  onCancel,
  onSubmit,
}: {
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (body: CreatePlanRequest) => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');

  const price = Number(priceAmount);
  const duration = durationDays.trim() === '' ? null : Number(durationDays);
  const order = displayOrder.trim() === '' ? 0 : Number(displayOrder);

  const valid =
    code.trim() !== '' &&
    name.trim() !== '' &&
    priceAmount.trim() !== '' &&
    Number.isFinite(price) &&
    price >= 0 &&
    (duration === null || (Number.isFinite(duration) && duration > 0)) &&
    Number.isFinite(order);

  return (
    <form
      className="card mb-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() === '' ? undefined : description.trim(),
          durationDays: duration,
          priceAmount: price,
          displayOrder: order,
        });
      }}
    >
      <div>
        <h2 className="font-semibold text-slate-900">Tạo gói mới</h2>
        <p className="mt-1 text-sm text-slate-600">
          Gói được tạo ở trạng thái <strong>Nháp</strong> và chưa bán được. Sau khi
          kiểm tra lại giá và thời hạn, hãy mở phần sửa gói và đổi trạng thái sang{' '}
          <strong>Đang bán</strong> để học viên nhìn thấy.
        </p>
      </div>

      {error && <ResultBanner tone="danger" message={error} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="plan-code" className="label">
            Mã gói
          </label>
          <input
            id="plan-code"
            type="text"
            className="input font-mono uppercase"
            placeholder="PREMIUM_3M"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Không đổi được sau khi tạo — dùng để đối chiếu đơn hàng.
          </p>
        </div>

        <div>
          <label htmlFor="plan-name" className="label">
            Tên gói
          </label>
          <input
            id="plan-name"
            type="text"
            className="input"
            placeholder="Premium 3 tháng"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="plan-description" className="label">
            Mô tả
          </label>
          <textarea
            id="plan-description"
            className="input"
            rows={2}
            placeholder="Mô tả ngắn hiển thị cho học viên"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="plan-duration" className="label">
            Thời hạn (ngày)
          </label>
          <input
            id="plan-duration"
            type="number"
            min={1}
            className="input"
            placeholder="Để trống = trọn đời"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
          />
          <p className="mt-1 text-xs text-amber-700">
            Chỉ đặt được một lần lúc tạo. Đơn đã bán tính theo giá trị lúc mua nên
            thời hạn không sửa lại được về sau.
          </p>
        </div>

        <div>
          <label htmlFor="plan-price" className="label">
            Giá (VND)
          </label>
          <input
            id="plan-price"
            type="number"
            min={0}
            step={1000}
            className="input"
            placeholder="499000"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            required
          />
          {priceAmount.trim() !== '' && Number.isFinite(price) && (
            <p className="mt-1 text-xs text-slate-500">{formatCurrency(price)}</p>
          )}
        </div>

        <div>
          <label htmlFor="plan-order" className="label">
            Thứ tự hiển thị
          </label>
          <input
            id="plan-order"
            type="number"
            className="input"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">Số nhỏ hiện trước.</p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn-primary" disabled={!valid || submitting}>
          {submitting ? 'Đang tạo…' : 'Tạo gói'}
        </button>
      </div>
    </form>
  );
}

function EditPlanForm({
  plan,
  submitting,
  error,
  onCancel,
  onSubmit,
}: {
  plan: AdminPlan;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (body: UpdatePlanRequest) => void;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [priceAmount, setPriceAmount] = useState(String(plan.priceAmount));
  const [displayOrder, setDisplayOrder] = useState(String(plan.displayOrder));
  const [status, setStatus] = useState<PlanStatus>(plan.status);

  const price = Number(priceAmount);
  const order = Number(displayOrder);

  const valid =
    name.trim() !== '' &&
    Number.isFinite(price) &&
    price >= 0 &&
    Number.isFinite(order);

  return (
    <form
      className="card mb-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit({
          name: name.trim(),
          description: description.trim(),
          priceAmount: price,
          displayOrder: order,
          status,
        });
      }}
    >
      <div>
        <h2 className="font-semibold text-slate-900">
          Sửa gói <span className="font-mono text-sm text-slate-600">{plan.code}</span>
        </h2>
        {plan.status === 'DRAFT' && (
          <p className="mt-1 text-sm text-amber-700">
            Gói đang ở trạng thái Nháp nên chưa bán được. Đổi trạng thái sang{' '}
            <strong>Đang bán</strong> để học viên mua được.
          </p>
        )}
      </div>

      {error && <ResultBanner tone="danger" message={error} />}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="edit-name" className="label">
            Tên gói
          </label>
          <input
            id="edit-name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="edit-status" className="label">
            Trạng thái
          </label>
          <select
            id="edit-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as PlanStatus)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="edit-description" className="label">
            Mô tả
          </label>
          <textarea
            id="edit-description"
            className="input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Thời hạn chỉ đọc: đơn đã bán tính quyền theo giá trị lúc mua */}
        <div>
          <span className="label">Thời hạn</span>
          <div className="input flex items-center bg-slate-50 text-slate-600">
            {planDurationLabel(plan.durationDays)}
          </div>
          <p className="mt-1 text-xs text-amber-700">
            Không sửa được thời hạn của gói đã tạo. Đơn đã bán tính hiệu lực Premium
            theo thời hạn tại thời điểm mua; đổi lại sẽ làm sai lịch sử của các đơn
            cũ. Cần thời hạn khác thì tạo gói mới và ngừng bán gói này.
          </p>
        </div>

        <div>
          <label htmlFor="edit-price" className="label">
            Giá (VND)
          </label>
          <input
            id="edit-price"
            type="number"
            min={0}
            step={1000}
            className="input"
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            {Number.isFinite(price) ? formatCurrency(price, plan.currency) : '—'} · Giá
            mới chỉ áp cho đơn tạo sau khi lưu.
          </p>
        </div>

        <div>
          <label htmlFor="edit-order" className="label">
            Thứ tự hiển thị
          </label>
          <input
            id="edit-order"
            type="number"
            className="input"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="btn-primary" disabled={!valid || submitting}>
          {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}
