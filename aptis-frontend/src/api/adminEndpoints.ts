import { api } from './client';
import type { PageResponse } from '@/types/api';
import type {
  AdminEntitlement,
  AdminSubscription,
  AdminBankTransfer,
  BankAccount,
  BankTransferStatus,
  AdminOrder,
  AdminPlan,
  AdminQuestionSet,
  CreatePlanRequest,
  CreateQuestionSetRequest,
  CreateRefundRequest,
  CreateTrialCampaignRequest,
  ExportJob,
  ExportType,
  GrantEntitlementRequest,
  ImportJob,
  PreviewResult,
  PublishResult,
  QuestionSetSearchParams,
  Refund,
  RefundStatus,
  RevisionSummary,
  TrialCampaign,
  UpdatePlanRequest,
  UpdateQuestionSetRequest,
  SaveBankAccountRequest,
  AccessState,
  AdminRole,
  AdminUser,
  UserStatus,
  PartScoringRule,
  UpdatePartScoringRule,
  AdminSkillTest,
  CreateSkillTestRequest,
  BatchCreateSkillTestRequest,
} from '@/types/admin';

// ---------------------------------------------------------------------
// Ngân hàng câu hỏi
// ---------------------------------------------------------------------

export const adminContentApi = {
  create: (body: CreateQuestionSetRequest) =>
    api.post<AdminQuestionSet>('/admin/question-sets', body).then((r) => r.data),

  update: (id: string, body: UpdateQuestionSetRequest) =>
    api.patch<AdminQuestionSet>(`/admin/question-sets/${id}`, body).then((r) => r.data),

  search: (params: QuestionSetSearchParams = {}) =>
    api
      .get<PageResponse<AdminQuestionSet>>('/admin/question-sets', {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  detail: (id: string) =>
    api.get<AdminQuestionSet>(`/admin/question-sets/${id}`).then((r) => r.data),

  revisions: (id: string) =>
    api
      .get<RevisionSummary[]>(`/admin/question-sets/${id}/revisions`)
      .then((r) => r.data),

  /** revealAnswers chỉ dành cho biên tập viên; mặc định xem đúng bản học viên thấy. */
  preview: (id: string, revealAnswers = false) =>
    api
      .get<PreviewResult>(`/admin/question-sets/${id}/preview`, {
        params: { revealAnswers },
      })
      .then((r) => r.data),

  submitForReview: (id: string) =>
    api
      .post<AdminQuestionSet>(`/admin/question-sets/${id}/submit-review`)
      .then((r) => r.data),

  requestChanges: (id: string, reason: string) =>
    api
      .post<AdminQuestionSet>(`/admin/question-sets/${id}/request-changes`, { reason })
      .then((r) => r.data),

  /**
   * Không đạt điều kiện publish thì backend trả 200 kèm `errors`, không phải
   * lỗi HTTP — người soạn cần thấy đủ danh sách để sửa một lượt.
   */
  publish: (id: string) =>
    api
      .post<PublishResult>(`/admin/question-sets/${id}/publish`)
      .then((r) => r.data),

  suspend: (id: string, reason: string) =>
    api
      .post<AdminQuestionSet>(`/admin/question-sets/${id}/suspend`, { reason })
      .then((r) => r.data),

  archive: (id: string) =>
    api.post<AdminQuestionSet>(`/admin/question-sets/${id}/archive`).then((r) => r.data),
};

export const adminScoringApi = {
  list: () => api.get<PartScoringRule[]>('/admin/scoring-rules').then((r) => r.data),
  update: (rules: UpdatePartScoringRule[]) =>
    api.put<PartScoringRule[]>('/admin/scoring-rules', { rules }).then((r) => r.data),
};

export const adminSkillTestApi = {
  list: (componentId?: string) =>
    api.get<AdminSkillTest[]>('/admin/skill-tests', { params: { componentId } }).then((r) => r.data),
  create: (body: CreateSkillTestRequest) =>
    api.post<AdminSkillTest>('/admin/skill-tests', body).then((r) => r.data),
  createBatch: (body: BatchCreateSkillTestRequest) =>
    api.post<AdminSkillTest[]>('/admin/skill-tests/batch', body).then((r) => r.data),
  archive: (id: string) =>
    api.post<AdminSkillTest>(`/admin/skill-tests/${id}/archive`).then((r) => r.data),
};

// ---------------------------------------------------------------------
// Gói Premium
// ---------------------------------------------------------------------

export const adminPlanApi = {
  list: () => api.get<AdminPlan[]>('/admin/plans').then((r) => r.data),

  create: (body: CreatePlanRequest) =>
    api.post<AdminPlan>('/admin/plans', body).then((r) => r.data),

  update: (planId: string, body: UpdatePlanRequest) =>
    api.patch<AdminPlan>(`/admin/plans/${planId}`, body).then((r) => r.data),
};

// ---------------------------------------------------------------------
// Đơn hàng và hoàn tiền
// ---------------------------------------------------------------------

export const adminOrderApi = {
  list: (page = 0, size = 20) =>
    api
      .get<PageResponse<AdminOrder>>('/admin/orders', { params: { page, size } })
      .then((r) => r.data),

  detail: (orderId: string) =>
    api.get<AdminOrder>(`/admin/orders/${orderId}`).then((r) => r.data),

  refund: (orderId: string, body: CreateRefundRequest) =>
    api.post<Refund>(`/admin/orders/${orderId}/refunds`, body).then((r) => r.data),
};

export const adminRefundApi = {
  list: (status: RefundStatus | undefined, page = 0, size = 20) =>
    api
      .get<PageResponse<Refund>>('/admin/refunds', { params: { status, page, size } })
      .then((r) => r.data),

  reject: (refundId: string, reason: string) =>
    api.post<Refund>(`/admin/refunds/${refundId}/reject`, { reason }).then((r) => r.data),
};

export const adminBankTransferApi = {
  list: (status: BankTransferStatus | undefined, page = 0, size = 20) =>
    api
      .get<PageResponse<AdminBankTransfer>>('/admin/bank-transfers', {
        params: { status, page, size },
      })
      .then((r) => r.data),

  findByCode: (transferCode: string) =>
    api
      .get<AdminBankTransfer>(`/admin/bank-transfers/by-code/${transferCode}`)
      .then((r) => r.data),

  confirm: (transferId: string, body: { receivedAmount?: number; note?: string }) =>
    api
      .post<AdminBankTransfer>(`/admin/bank-transfers/${transferId}/confirm`, body)
      .then((r) => r.data),

  reject: (transferId: string, reason?: string) =>
    api
      .post<AdminBankTransfer>(`/admin/bank-transfers/${transferId}/reject`, { reason })
      .then((r) => r.data),

  accounts: () => api.get<BankAccount[]>('/admin/bank-accounts').then((r) => r.data),

  updateAccount: (accountId: string, body: SaveBankAccountRequest) =>
    api
      .patch<BankAccount>(`/admin/bank-accounts/${accountId}`, body)
      .then((r) => r.data),
};

// ---------------------------------------------------------------------
// Quyền và chiến dịch dùng thử
// ---------------------------------------------------------------------

export const adminEntitlementApi = {
  ofUser: (userId: string) =>
    api
      .get<AdminEntitlement[]>(`/admin/users/${userId}/entitlements`)
      .then((r) => r.data),

  grant: (userId: string, body: GrantEntitlementRequest) =>
    api
      .post<AdminEntitlement>(`/admin/users/${userId}/entitlements`, body)
      .then((r) => r.data),

  revoke: (entitlementId: string, reason?: string) =>
    api
      .delete<void>(`/admin/entitlements/${entitlementId}`, { params: { reason } })
      .then((r) => r.data),

  subscriptionsOfUser: (userId: string) =>
    api
      .get<AdminSubscription[]>(`/admin/users/${userId}/subscriptions`)
      .then((r) => r.data),

  revokeSubscription: (subscriptionId: string, reason: string) =>
    api
      .post<AdminSubscription>(`/admin/subscriptions/${subscriptionId}/revoke`, { reason })
      .then((r) => r.data),
};

export const adminUserApi = {
  list: (
    params: {
      q?: string;
      status?: UserStatus;
      access?: AccessState;
      page?: number;
      size?: number;
    } = {},
  ) =>
    api
      .get<PageResponse<AdminUser>>('/admin/users', {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  roles: () => api.get<AdminRole[]>('/admin/users/roles').then((r) => r.data),

  updateStatus: (userId: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api.patch<AdminUser>(`/admin/users/${userId}/status`, { status }).then((r) => r.data),

  updateRoles: (userId: string, roles: string[]) =>
    api.put<AdminUser>(`/admin/users/${userId}/roles`, { roles }).then((r) => r.data),
};

export const adminTrialApi = {
  create: (body: CreateTrialCampaignRequest) =>
    api.post<TrialCampaign>('/admin/trial-campaigns', body).then((r) => r.data),

  setStatus: (campaignId: string, status: string) =>
    api
      .patch<TrialCampaign>(`/admin/trial-campaigns/${campaignId}/status`, null, {
        params: { status },
      })
      .then((r) => r.data),
};

// ---------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------

export const adminImportApi = {
  list: (page = 0, size = 20) =>
    api
      .get<PageResponse<ImportJob>>('/admin/import-jobs', { params: { page, size } })
      .then((r) => r.data),

  detail: (id: string) =>
    api.get<ImportJob>(`/admin/import-jobs/${id}`).then((r) => r.data),

  create: (sourceAssetId: string) =>
    api
      .post<ImportJob>('/admin/import-jobs', { sourceAssetId })
      .then((r) => r.data),
};

export const adminExportApi = {
  list: (page = 0, size = 20) =>
    api
      .get<PageResponse<ExportJob>>('/admin/export-jobs', { params: { page, size } })
      .then((r) => r.data),

  detail: (id: string) =>
    api.get<ExportJob>(`/admin/export-jobs/${id}`).then((r) => r.data),

  create: (exportType: ExportType, params?: Record<string, unknown>) =>
    api.post<ExportJob>('/admin/export-jobs', { exportType, params }).then((r) => r.data),
};
