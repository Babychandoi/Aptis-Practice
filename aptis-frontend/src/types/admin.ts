/**
 * Kiểu dữ liệu cho khu vực quản trị.
 *
 * Tách khỏi `types/api.ts` vì phần này chỉ dùng ở trang admin — trang học viên
 * không phải tải kèm.
 */

import type { ResponseType } from './api';

export type ContentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'PUBLISHED'
  | 'SUSPENDED'
  | 'ARCHIVED';

export type AccessLevel = 'FREE' | 'PREMIUM';

export type CefrLevel = 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C' | 'C1' | 'C2';

// ---------------------------------------------------------------------
// Ngân hàng câu hỏi
// ---------------------------------------------------------------------

export interface AdminQuestionSet {
  id: string;
  code: string;
  title: string;
  partId: string;
  partName: string;
  componentCode: string;
  taskTypeCode: string;
  topicId: string | null;
  topicName: string | null;
  difficulty: number | null;
  hotness: number | null;
  cefrMin: CefrLevel | null;
  cefrMax: CefrLevel | null;
  accessLevel: AccessLevel;
  status: ContentStatus;
  currentRevision: number;
  contentChecksum: string | null;
  itemCount: number;
  estimatedSeconds: number | null;
  maxScore: number;
  publishedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  content: QuestionContent | null;
}

export interface RichContentPayload {
  type?: string;
  format: 'PLAIN_TEXT' | 'MARKDOWN' | 'HTML';
  value: string;
}

export interface QuestionOptionPayload {
  id: string;
  code?: string;
  content: string;
}

export interface AnswerKeyPayload {
  type: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  matches?: Record<string, string>;
  orderedOptionIds?: string[];
  acceptedValues?: string[];
  caseSensitive?: boolean;
}

export interface QuestionItemPayload {
  id: string;
  sequenceNo: number;
  prompt: RichContentPayload;
  responseType: ResponseType;
  required: boolean;
  maxScore: number;
  options: QuestionOptionPayload[];
  leftItems: QuestionOptionPayload[];
  rightItems: QuestionOptionPayload[];
  constraints: Record<string, unknown>;
  rubricCode?: string;
  answerKey?: AnswerKeyPayload;
  explanation?: RichContentPayload;
}

export interface QuestionContent {
  instructions: string;
  stimulus?: RichContentPayload | null;
  sections: Array<{ id: string; label?: string; content?: RichContentPayload }>;
  items: QuestionItemPayload[];
  assets: Array<{ assetId: string; role?: string; displayOrder?: number }>;
  settings: {
    shuffleOptions: boolean;
    shuffleItems: boolean;
    maxAudioPlays?: number | null;
    showAnswerAfterEachItem: boolean;
    allowReview: boolean;
  };
  scoring: { strategy: string; partialCredit: boolean };
}

export interface CreateQuestionSetRequest {
  partId: string;
  taskTypeId: string;
  topicId?: string | null;
  topicName?: string | null;
  code: string;
  title?: string;
  difficulty?: number | null;
  hotness?: number | null;
  cefrMin?: CefrLevel | null;
  cefrMax?: CefrLevel | null;
  accessLevel: AccessLevel;
  estimatedSeconds?: number | null;
  content: QuestionContent;
}

export type UpdateQuestionSetRequest = Omit<CreateQuestionSetRequest, 'partId' | 'taskTypeId' | 'code'>;

/** Publish trả về cả danh sách lỗi khi không đạt, thay vì chỉ báo thất bại. */
export interface PublishResult {
  questionSetId: string;
  status: ContentStatus;
  revision: number;
  contentChecksum: string | null;
  errors: string[];
}

export interface RevisionSummary {
  revision: number;
  changeSummary: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface PreviewResult {
  questionSetId: string;
  revision: number;
  /** false chỉ khi editor yêu cầu xem kèm đáp án */
  answersHidden: boolean;
  content: import('./api').QuestionSetContent;
}

export interface QuestionSetSearchParams {
  partId?: string;
  status?: ContentStatus;
  q?: string;
  page?: number;
  size?: number;
}

export interface PartScoringRule {
  id: string;
  componentCode: string;
  componentName: string;
  partId: string;
  partCode: string;
  partName: string;
  maxScore: number;
  pointsPerCorrect: number | null;
  perfectBonus: number;
  includedInOverall: boolean;
  componentOrder: number;
  partOrder: number;
}

export interface UpdatePartScoringRule {
  id: string;
  maxScore: number;
  pointsPerCorrect: number | null;
  perfectBonus: number;
}

export type SkillTestAssemblyMode = 'FIXED' | 'GENERATED_RANDOM' | 'DYNAMIC_RANDOM' | 'BATCH_RANDOM';

export interface AdminSkillTestRule {
  partId: string;
  partName: string;
  displayOrder: number;
  selectionStrategy: 'FIXED' | 'RANDOM';
  questionSetId: string | null;
  questionSetTitle: string | null;
}

export interface AdminSkillTest {
  id: string;
  componentId: string;
  componentCode: string;
  componentName: string;
  code: string;
  name: string;
  description: string | null;
  accessLevel: AccessLevel;
  durationSeconds: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  assemblyMode: SkillTestAssemblyMode;
  parts: AdminSkillTestRule[];
}

export interface CreateSkillTestRequest {
  componentId: string;
  code: string;
  name: string;
  description?: string;
  accessLevel: AccessLevel;
  durationSeconds?: number;
  assemblyMode: SkillTestAssemblyMode;
  parts: Array<{ partId: string; questionSetId?: string | null }>;
}

export interface BatchCreateSkillTestRequest {
  componentId: string;
  accessLevel: AccessLevel;
  durationSeconds?: number;
  quantity?: number;
}

// ---------------------------------------------------------------------
// Gói Premium
// ---------------------------------------------------------------------

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billingType: string;
  /** null = gói trọn đời */
  durationDays: number | null;
  priceAmount: number;
  currency: string;
  status: PlanStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  code: string;
  name: string;
  description?: string;
  durationDays?: number | null;
  priceAmount: number;
  currency?: string;
  displayOrder?: number;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  priceAmount?: number;
  status?: PlanStatus;
  displayOrder?: number;
}

// ---------------------------------------------------------------------
// Đơn hàng và hoàn tiền
// ---------------------------------------------------------------------

export type OrderStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface AdminOrder {
  id: string;
  orderCode: string;
  userId: string;
  userEmail: string | null;
  status: OrderStatus;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  refundedAmount: number;
}

export type RefundStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REJECTED';

export interface Refund {
  id: string;
  orderId: string;
  amount: number;
  status: RefundStatus;
  reason: string | null;
  providerRefundId: string | null;
  requestedAt: string;
  completedAt: string | null;
}

export interface CreateRefundRequest {
  /** Bỏ trống = hoàn toàn bộ phần còn lại */
  amount?: number | null;
  reason?: string;
}

// ---------------------------------------------------------------------
// Chuyển khoản ngân hàng thủ công
// ---------------------------------------------------------------------

export type BankTransferStatus =
  | 'PENDING'
  | 'CLAIMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'EXPIRED';

export interface AdminBankTransfer {
  id: string;
  orderId: string;
  orderCode: string | null;
  userEmail: string | null;
  transferCode: string;
  amount: number;
  currency: string;
  status: BankTransferStatus;
  claimNote: string | null;
  adminNote: string | null;
  confirmedAmount: number | null;
  claimedAt: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrAssetId: string | null;
  transferNote: string | null;
  active: boolean;
  displayOrder: number;
}

export interface SaveBankAccountRequest {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrAssetId?: string | null;
  transferNote?: string;
  active: boolean;
  displayOrder: number;
}

// ---------------------------------------------------------------------
// Quyền và chiến dịch dùng thử
// ---------------------------------------------------------------------

export interface AdminEntitlement {
  id: string;
  userId: string;
  entitlementCode: string;
  sourceType: string;
  sourceId: string | null;
  startsAt: string;
  endsAt: string | null;
  revokedAt: string | null;
}

export interface GrantEntitlementRequest {
  entitlementCode: string;
  /** Bỏ trống = vĩnh viễn */
  durationDays?: number | null;
  reason?: string;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  sourceOrderId: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
}

// ---------------------------------------------------------------------
// Quản lý người dùng
// ---------------------------------------------------------------------

export type UserStatus =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'LOCKED'
  | 'SUSPENDED'
  | 'DELETED';

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  emailVerified: boolean;
  fullName: string | null;
  displayName: string | null;
  roles: string[];
  premiumActive: boolean;
  premiumEndsAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminRole {
  code: string;
  name: string;
  description: string | null;
}

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

export interface TrialCampaign {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  maxUsesPerUser: number;
  status: CampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
}

export interface CreateTrialCampaignRequest {
  code: string;
  name: string;
  durationDays: number;
  maxUsesPerUser?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

// ---------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------

export type JobStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_FAILED'
  | 'FAILED';

export interface ImportJob {
  id: string;
  importType: string;
  status: JobStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  /** Tải qua Asset API để lấy signed URL */
  errorReportAssetId: string | null;
  errorMessage: string | null;
  queuedAt: string;
  completedAt: string | null;
}

export type ExportType =
  | 'LEARNING_REPORT'
  | 'REVENUE_REPORT'
  | 'ATTEMPT_DETAIL'
  | 'USER_LIST';

export interface ExportJob {
  id: string;
  exportType: ExportType;
  status: JobStatus;
  resultAssetId: string | null;
  errorMessage: string | null;
  queuedAt: string;
  completedAt: string | null;
  /** Quá hạn là file bị xóa khỏi storage, không tải lại được */
  expiresAt: string | null;
}
