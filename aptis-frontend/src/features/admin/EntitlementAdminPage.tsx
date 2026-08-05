import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminEntitlementApi, adminTrialApi } from '@/api/adminEndpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { formatDateTime } from '@/lib/format';
import { DataTable, PageHeader, ResultBanner, StatusBadge } from './components/AdminUi';
import { usePermission } from './usePermission';
import type {
  AdminEntitlement,
  CampaignStatus,
  CreateTrialCampaignRequest,
  TrialCampaign,
} from '@/types/admin';

const SUGGESTED_CODE = 'PREMIUM_CONTENT_ACCESS';

const CAMPAIGN_STATUSES: CampaignStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'];

const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Nháp',
  ACTIVE: 'Đang chạy',
  PAUSED: 'Tạm dừng',
  CLOSED: 'Đã đóng',
};

/** Quyền còn hiệu lực mới có nút thu hồi. */
function isActive(entitlement: AdminEntitlement): boolean {
  if (entitlement.revokedAt !== null) return false;
  if (entitlement.endsAt === null) return true;
  return new Date(entitlement.endsAt).getTime() > Date.now();
}

type Banner = { tone: 'success' | 'danger'; message: string } | null;

export function EntitlementAdminPage() {
  const { has } = usePermission();

  const [userIdInput, setUserIdInput] = useState('');
  /** userId đã xác nhận tra cứu — gõ dở không kích hoạt query. */
  const [lookupUserId, setLookupUserId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);

  const canGrant = has('entitlement:grant');
  const queryClient = useQueryClient();

  const entitlementsQuery = useQuery({
    queryKey: ['admin', 'entitlements', lookupUserId],
    queryFn: () => adminEntitlementApi.ofUser(lookupUserId ?? ''),
    enabled: canGrant && lookupUserId !== null,
  });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminEntitlementApi.revoke(id, reason),
    onSuccess: () => {
      setBanner({ tone: 'success', message: 'Đã thu hồi quyền.' });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'entitlements'] });
    },
    onError: (error) =>
      setBanner({
        tone: 'danger',
        message: error instanceof ApiError ? error.message : 'Không thu hồi được quyền',
      }),
  });

  if (!canGrant) {
    return (
      <ErrorBlock message="Bạn không có quyền quản lý quyền người dùng (entitlement:grant)." />
    );
  }

  const renderEntitlements = () => {
    if (lookupUserId === null) {
      return (
        <div className="card text-center text-sm text-slate-500">
          Nhập userId rồi bấm Tra cứu để xem quyền của người dùng.
        </div>
      );
    }

    if (entitlementsQuery.isPending) {
      return <LoadingBlock label="Đang tải danh sách quyền…" />;
    }

    if (entitlementsQuery.error || !entitlementsQuery.data) {
      return (
        <ErrorBlock
          message={
            entitlementsQuery.error instanceof ApiError
              ? entitlementsQuery.error.message
              : 'Không tải được danh sách quyền'
          }
          onRetry={() => void entitlementsQuery.refetch()}
        />
      );
    }

    const entitlements = entitlementsQuery.data;

    return (
      <DataTable
        headers={['Mã quyền', 'Nguồn cấp', 'Bắt đầu', 'Kết thúc', 'Thu hồi lúc', '']}
        isEmpty={entitlements.length === 0}
        empty="Người dùng này chưa có quyền nào."
      >
        {entitlements.map((entitlement) => (
          <tr key={entitlement.id}>
            <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-700">
              {entitlement.entitlementCode}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
              {entitlement.sourceType}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
              {formatDateTime(entitlement.startsAt)}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
              {entitlement.endsAt === null ? 'Vĩnh viễn' : formatDateTime(entitlement.endsAt)}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
              {formatDateTime(entitlement.revokedAt)}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5">
              {isActive(entitlement) && (
                <button
                  type="button"
                  className="btn-ghost !px-2 !py-1 text-xs text-red-700"
                  disabled={revoke.isPending}
                  onClick={() => {
                    const reason = window.prompt('Lý do thu hồi quyền này?');
                    // Bấm Hủy trong prompt trả null — coi như không thu hồi
                    if (reason === null) return;
                    revoke.mutate({
                      id: entitlement.id,
                      reason: reason.trim() === '' ? undefined : reason.trim(),
                    });
                  }}
                >
                  Thu hồi
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
        title="Quyền người dùng"
        description="Tra cứu, tặng và thu hồi quyền truy cập của từng tài khoản."
      />

      {banner && (
        <ResultBanner
          tone={banner.tone}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
        Quyền tặng tay đi qua đúng cơ chế entitlement như khi người dùng mua Premium, nên
        có hiệu lực ngay lập tức — không cần người dùng đăng nhập lại hay thao tác thêm.
      </p>

      <section className="card mb-5">
        <label htmlFor="user-id" className="label">
          userId (UUID)
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="user-id"
            type="text"
            className="input flex-1 font-mono text-sm"
            placeholder="00000000-0000-0000-0000-000000000000"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userIdInput.trim() !== '') {
                setLookupUserId(userIdInput.trim());
              }
            }}
          />
          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={userIdInput.trim() === ''}
            onClick={() => setLookupUserId(userIdInput.trim())}
          >
            Tra cứu
          </button>
        </div>
      </section>

      <h2 className="mb-2 font-semibold text-slate-900">Quyền hiện có</h2>
      {renderEntitlements()}

      {lookupUserId !== null && (
        <GrantForm
          userId={lookupUserId}
          onDone={(message) => setBanner({ tone: 'success', message })}
          onError={(message) => setBanner({ tone: 'danger', message })}
        />
      )}

      <TrialCampaignSection />
    </div>
  );
}

function GrantForm({
  userId,
  onDone,
  onError,
}: {
  userId: string;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}) {
  const queryClient = useQueryClient();

  const [code, setCode] = useState(SUGGESTED_CODE);
  const [durationDays, setDurationDays] = useState('');
  const [reason, setReason] = useState('');

  const grant = useMutation({
    mutationFn: () =>
      adminEntitlementApi.grant(userId, {
        entitlementCode: code.trim(),
        // Bỏ trống ô số ngày nghĩa là cấp vĩnh viễn
        durationDays: durationDays.trim() === '' ? null : Number(durationDays),
        reason: reason.trim() === '' ? undefined : reason.trim(),
      }),
    onSuccess: (entitlement) => {
      setReason('');
      setDurationDays('');
      onDone(`Đã tặng quyền ${entitlement.entitlementCode} cho người dùng.`);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'entitlements'] });
    },
    onError: (error) =>
      onError(error instanceof ApiError ? error.message : 'Không tặng được quyền'),
  });

  const durationInvalid =
    durationDays.trim() !== '' &&
    (!Number.isInteger(Number(durationDays)) || Number(durationDays) <= 0);

  return (
    <section className="card mt-5">
      <h2 className="font-semibold text-slate-900">Tặng quyền thủ công</h2>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div>
          <label htmlFor="grant-code" className="label">
            Mã quyền
          </label>
          <input
            id="grant-code"
            type="text"
            className="input font-mono text-sm"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="grant-duration" className="label">
            Số ngày hiệu lực
          </label>
          <input
            id="grant-duration"
            type="number"
            min={1}
            className="input"
            placeholder="Để trống = vĩnh viễn"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
          />
          {durationInvalid && (
            <p className="mt-1 text-xs text-red-700">Số ngày phải là số nguyên dương.</p>
          )}
        </div>

        <div>
          <label htmlFor="grant-reason" className="label">
            Lý do
          </label>
          <input
            id="grant-reason"
            type="text"
            className="input"
            placeholder="Ví dụ: đền bù sự cố"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        className="btn-primary mt-3"
        disabled={grant.isPending || code.trim() === '' || durationInvalid}
        onClick={() => grant.mutate()}
      >
        {grant.isPending ? 'Đang tặng…' : 'Tặng quyền'}
      </button>
    </section>
  );
}

/**
 * API chỉ có create và setStatus, không có endpoint liệt kê chiến dịch — nên
 * chỉ giữ được các chiến dịch vừa thao tác trong phiên này, mất khi tải lại
 * trang.
 */
function TrialCampaignSection() {
  const [campaigns, setCampaigns] = useState<TrialCampaign[]>([]);
  const [banner, setBanner] = useState<Banner>(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    durationDays: '7',
    maxUsesPerUser: '1',
    startsAt: '',
    endsAt: '',
  });

  const upsert = (campaign: TrialCampaign) =>
    setCampaigns((prev) => [
      campaign,
      ...prev.filter((existing) => existing.id !== campaign.id),
    ]);

  const create = useMutation({
    mutationFn: () => {
      const body: CreateTrialCampaignRequest = {
        code: form.code.trim(),
        name: form.name.trim(),
        durationDays: Number(form.durationDays),
        maxUsesPerUser:
          form.maxUsesPerUser.trim() === '' ? undefined : Number(form.maxUsesPerUser),
        // datetime-local cho chuỗi không có timezone; chuyển sang ISO UTC
        startsAt: form.startsAt === '' ? null : new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt === '' ? null : new Date(form.endsAt).toISOString(),
      };
      return adminTrialApi.create(body);
    },
    onSuccess: (campaign) => {
      upsert(campaign);
      setForm((prev) => ({ ...prev, code: '', name: '' }));
      setBanner({ tone: 'success', message: `Đã tạo chiến dịch ${campaign.code}.` });
    },
    onError: (error) =>
      setBanner({
        tone: 'danger',
        message: error instanceof ApiError ? error.message : 'Không tạo được chiến dịch',
      }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      adminTrialApi.setStatus(id, status),
    onSuccess: (campaign) => {
      upsert(campaign);
      setBanner({
        tone: 'success',
        message: `Chiến dịch ${campaign.code} chuyển sang ${CAMPAIGN_STATUS_LABELS[campaign.status]}.`,
      });
    },
    onError: (error) =>
      setBanner({
        tone: 'danger',
        message:
          error instanceof ApiError ? error.message : 'Không đổi được trạng thái chiến dịch',
      }),
  });

  const durationValid =
    form.durationDays.trim() !== '' &&
    Number.isInteger(Number(form.durationDays)) &&
    Number(form.durationDays) > 0;

  const canSubmit =
    form.code.trim() !== '' && form.name.trim() !== '' && durationValid && !create.isPending;

  return (
    <section className="mt-8">
      <h2 className="mb-1 font-semibold text-slate-900">Chiến dịch dùng thử</h2>
      <p className="mb-3 text-sm text-slate-500">
        Hệ thống chưa có API liệt kê chiến dịch, nên khu vực này chỉ hiển thị những chiến
        dịch bạn vừa tạo hoặc vừa đổi trạng thái trong phiên làm việc này.
      </p>

      {banner && (
        <ResultBanner
          tone={banner.tone}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      <div className="card">
        <h3 className="font-medium text-slate-900">Tạo chiến dịch</h3>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <label htmlFor="campaign-code" className="label">
              Mã chiến dịch
            </label>
            <input
              id="campaign-code"
              type="text"
              className="input font-mono text-sm"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="campaign-name" className="label">
              Tên chiến dịch
            </label>
            <input
              id="campaign-name"
              type="text"
              className="input"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="campaign-duration" className="label">
              Số ngày dùng thử
            </label>
            <input
              id="campaign-duration"
              type="number"
              min={1}
              className="input"
              value={form.durationDays}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, durationDays: e.target.value }))
              }
            />
          </div>

          <div>
            <label htmlFor="campaign-max-uses" className="label">
              Số lượt tối đa mỗi người
            </label>
            <input
              id="campaign-max-uses"
              type="number"
              min={1}
              className="input"
              value={form.maxUsesPerUser}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, maxUsesPerUser: e.target.value }))
              }
            />
          </div>

          <div />

          <div>
            <label htmlFor="campaign-starts" className="label">
              Bắt đầu
            </label>
            <input
              id="campaign-starts"
              type="datetime-local"
              className="input"
              value={form.startsAt}
              onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="campaign-ends" className="label">
              Kết thúc
            </label>
            <input
              id="campaign-ends"
              type="datetime-local"
              className="input"
              value={form.endsAt}
              onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
            />
          </div>
        </div>

        <button
          type="button"
          className="btn-primary mt-3"
          disabled={!canSubmit}
          onClick={() => create.mutate()}
        >
          {create.isPending ? 'Đang tạo…' : 'Tạo chiến dịch'}
        </button>
      </div>

      {campaigns.length > 0 && (
        <div className="mt-4">
          <DataTable
            headers={['Mã', 'Tên', 'Số ngày', 'Lượt/người', 'Trạng thái', 'Đổi trạng thái']}
            isEmpty={false}
          >
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-700">
                  {campaign.code}
                </td>
                <td className="px-4 py-2.5 text-slate-900">{campaign.name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {campaign.durationDays}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {campaign.maxUsesPerUser}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <StatusBadge status={campaign.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <select
                    className="input !py-1 text-xs"
                    value={campaign.status}
                    disabled={setStatus.isPending}
                    onChange={(e) =>
                      setStatus.mutate({
                        id: campaign.id,
                        status: e.target.value as CampaignStatus,
                      })
                    }
                  >
                    {CAMPAIGN_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {CAMPAIGN_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </section>
  );
}
