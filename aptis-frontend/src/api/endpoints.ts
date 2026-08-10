import { api } from './client';
import type {
  Attempt,
  AttemptSummary,
  AssetResponse,
  BankTransferInstruction,
  ComponentSummary,
  CreateCustomAttemptRequest,
  CreatePartAttemptRequest,
  Entitlement,
  EvaluationResult,
  ExamVersion,
  ItemResponsePayload,
  MeResponse,
  MockTest,
  Order,
  PageResponse,
  PartSummary,
  Payment,
  Plan,
  ProfileResponse,
  QuestionSetScore,
  QuestionSetSummary,
  Subscription,
  TokenResponse,
  Topic,
  UploadUrlResponse,
} from '@/types/api';

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

export const authApi = {
  register: (body: { email: string; password: string; fullName?: string }) =>
    api.post<void>('/auth/register', body).then((r) => r.data),

  verifyEmail: (token: string) =>
    api.post<void>('/auth/verify-email', { token }).then((r) => r.data),

  login: (body: { email: string; password: string; deviceId?: string }) =>
    api.post<TokenResponse>('/auth/login', body).then((r) => r.data),

  logout: (body: { refreshToken?: string | null; allDevices?: boolean }) =>
    api.post<void>('/auth/logout', body).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<void>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (body: { token: string; newPassword: string }) =>
    api.post<void>('/auth/reset-password', body).then((r) => r.data),

  me: () => api.get<MeResponse>('/me').then((r) => r.data),

  updateProfile: (body: Partial<ProfileResponse>) =>
    api.patch<ProfileResponse>('/me/profile', body).then((r) => r.data),
};

// ---------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------

export const catalogApi = {
  examVersions: (examProductId?: string) =>
    api
      .get<ExamVersion[]>('/exam-versions', { params: { examProductId } })
      .then((r) => r.data),

  components: (examVersionId: string) =>
    api
      .get<ComponentSummary[]>('/components', { params: { examVersionId } })
      .then((r) => r.data),

  parts: (componentId: string) =>
    api.get<PartSummary[]>(`/components/${componentId}/parts`).then((r) => r.data),

  part: (partId: string) => api.get<PartSummary>(`/parts/${partId}`).then((r) => r.data),

  questionSets: (partId: string, page = 0, size = 20) =>
    api
      .get<QuestionSetSummary[]>(`/parts/${partId}/question-sets`, {
        params: { page, size },
      })
      .then((r) => r.data),

  topics: () => api.get<Topic[]>('/topics').then((r) => r.data),

};

// ---------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------

export const practiceApi = {
  createPartAttempt: (body: CreatePartAttemptRequest) =>
    api.post<Attempt>('/practice/part-attempts', body).then((r) => r.data),

  createCustomAttempt: (body: CreateCustomAttemptRequest) =>
    api.post<Attempt>('/practice/custom-attempts', body).then((r) => r.data),

  getAttempt: (attemptId: string) =>
    api.get<Attempt>(`/attempts/${attemptId}`).then((r) => r.data),

  start: (attemptId: string) =>
    api.post<Attempt>(`/attempts/${attemptId}/start`).then((r) => r.data),

  /** Autosave — gọi được nhiều lần, backend ghi đè theo itemId. */
  saveResponses: (
    attemptId: string,
    questionSetId: string,
    body: { itemResponses: ItemResponsePayload[]; timeSpentSeconds?: number },
  ) =>
    api
      .put<void>(`/attempts/${attemptId}/responses/${questionSetId}`, body)
      .then((r) => r.data),

  /** Nộp riêng một bộ để xem điểm và đáp án của đúng đề đó, lượt vẫn tiếp tục. */
  scoreQuestionSet: (attemptId: string, questionSetId: string) =>
    api
      .post<QuestionSetScore>(`/attempts/${attemptId}/responses/${questionSetId}/score`)
      .then((r) => r.data),

  submit: (attemptId: string) =>
    api.post<Attempt>(`/attempts/${attemptId}/submit`).then((r) => r.data),

  listAttempts: (page = 0, size = 20) =>
    api
      .get<PageResponse<AttemptSummary>>('/attempts', { params: { page, size } })
      .then((r) => r.data),

  /** Kết quả chấm AI; rỗng nghĩa là chưa chấm xong. */
  evaluations: (attemptId: string) =>
    api.get<EvaluationResult[]>(`/attempts/${attemptId}/evaluations`).then((r) => r.data),
};

// ---------------------------------------------------------------------
// Thi thử
// ---------------------------------------------------------------------

export const mockTestApi = {
  list: (componentId?: string) => api.get<MockTest[]>('/mock-tests', { params: { componentId } }).then((r) => r.data),

  detail: (blueprintId: string) =>
    api.get<MockTest>(`/mock-tests/${blueprintId}`).then((r) => r.data),

  createAttempt: (blueprintId: string) =>
    api.post<Attempt>(`/mock-tests/${blueprintId}/attempts`).then((r) => r.data),
};

// ---------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------

export const billingApi = {
  plans: () => api.get<Plan[]>('/plans').then((r) => r.data),
  currentSubscriptions: () =>
    api.get<Subscription[]>('/subscriptions/current').then((r) => r.data),

  entitlements: () => api.get<Entitlement[]>('/entitlements').then((r) => r.data),

  /** Idempotency-Key bắt buộc: bấm hai lần không tạo hai đơn. */
  createOrder: (body: { planId: string }, idempotencyKey: string) =>
    api
      .post<Order>('/orders', body, { headers: { 'Idempotency-Key': idempotencyKey } })
      .then((r) => r.data),

  order: (orderId: string) => api.get<Order>(`/orders/${orderId}`).then((r) => r.data),

  createPayment: (
    orderId: string,
    body: { provider: string; returnUrl?: string },
    idempotencyKey: string,
  ) =>
    api
      .post<Payment>(`/orders/${orderId}/payments`, body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data),

  payment: (paymentId: string) =>
    api.get<Payment>(`/payments/${paymentId}`).then((r) => r.data),

  createBankTransfer: (orderId: string) =>
    api
      .post<BankTransferInstruction>(`/orders/${orderId}/bank-transfer`)
      .then((r) => r.data),

  claimBankTransfer: (orderId: string, note?: string) =>
    api
      .post<BankTransferInstruction>(`/orders/${orderId}/bank-transfer/claim`, {
        note: note?.trim() || undefined,
      })
      .then((r) => r.data),

  refreshBankTransferQr: (orderId: string) =>
    api
      .post<BankTransferInstruction>(`/orders/${orderId}/bank-transfer/refresh`)
      .then((r) => r.data),
};

// ---------------------------------------------------------------------
// Asset
// ---------------------------------------------------------------------

export const assetApi = {
  createUploadUrl: (body: {
    assetType: string;
    mimeType: string;
    filename?: string;
    fileSize?: number;
    attemptId?: string;
    questionSetId?: string;
  }) => api.post<UploadUrlResponse>('/assets/upload-url', body).then((r) => r.data),

  complete: (assetId: string, body?: { durationMs?: number; checksumSha256?: string }) =>
    api.post<AssetResponse>(`/assets/${assetId}/complete`, body ?? {}).then((r) => r.data),

  signedUrl: (assetId: string) =>
    api.get<AssetResponse>(`/assets/${assetId}/signed-url`).then((r) => r.data),
};

/**
 * Upload trực tiếp lên MinIO bằng presigned URL — không đi qua backend.
 * Dùng fetch thô để không gắn Authorization header của hệ thống vào request
 * tới storage.
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
  });

  if (!response.ok) {
    throw new Error(`Upload thất bại: ${response.status}`);
  }
}
