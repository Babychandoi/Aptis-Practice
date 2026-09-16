/**
 * Type khớp với DTO của backend. Khi sửa DTO ở Java phải sửa cả file này.
 */

export type AccessLevel = 'FREE' | 'PREMIUM';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type PracticeMode = 'PART_PRACTICE' | 'CUSTOM_PRACTICE' | 'MOCK_TEST';

export type AttemptStatus =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'SCORING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'ABANDONED'
  | 'CANCELLED';

export type AttemptItemStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ANSWERED'
  | 'SCORED'
  | 'SKIPPED';

export type ResponseType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'GAP_FILL_CHOICE'
  | 'MATCHING'
  | 'ORDERING'
  | 'SENTENCE_ORDERING'
  | 'SHORT_TEXT'
  | 'TEXT_EXACT'
  | 'LONG_TEXT'
  | 'AUDIO_RECORDING';

// ---------------------------------------------------------------------
// Lỗi
// ---------------------------------------------------------------------

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fieldErrors?: ApiFieldError[];
  path?: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

/** Cấu hình đăng nhập ngoài. googleClientId rỗng = chưa bật Google. */
export interface AuthConfigResponse {
  googleClientId: string;
}

export interface TokenResponse {
  accessToken: string;
  /** Backend mới giữ refresh token trong cookie HttpOnly. */
  refreshToken: string | null;
  tokenType: string;
  expiresInSeconds: number;
  accessTokenExpiresAt: string;
}

export interface ProfileResponse {
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string;
  targetCefrLevel: CefrLevel | null;
  targetExamDate: string | null;
  timezone: string;
  locale: string;
}

export interface MeResponse {
  id: string;
  email: string;
  status: string;
  roles: string[];
  permissions: string[];
  emailVerified: boolean;
  profile: ProfileResponse;
  /** Đọc từ entitlement ở backend, không suy ra từ token */
  premiumActive: boolean;
  premiumEndsAt: string | null;
  /**
   * true = quyền đang có là dùng thử theo ngày tạo tài khoản, chưa mua gói.
   * premiumEndsAt lúc này là hạn dùng thử, nên nhãn phải nói "dùng thử" thay vì
   * "Premium" — người dùng bấm mới hiểu là cần mua.
   */
  premiumFromTrial: boolean;
}

// ---------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------

export interface ExamVersion {
  id: string;
  code: string;
  name: string;
  examProductId: string;
}

export interface ComponentSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  durationSeconds: number | null;
  maxScore: number | null;
}

export interface PartSummary {
  id: string;
  componentId: string;
  /** Mã kỹ năng (SPEAKING, READING…). Cần vì `code` chỉ là PART_1..PART_4. */
  componentCode: string;
  code: string;
  name: string;
  description: string | null;
  instructions: string | null;
  displayOrder: number;
  defaultDurationSeconds: number | null;
  publishedQuestionSetCount: number;
}

export interface QuestionSetSummary {
  id: string;
  code: string;
  title: string | null;
  taskTypeCode: string;
  topicName: string | null;
  hotness: number | null;
  itemCount: number;
  estimatedSeconds: number | null;
  accessLevel: AccessLevel;
  /** false → hiển thị ổ khóa, không tải nội dung */
  canAccess: boolean;
  lockReason: string | null;
}

export interface Topic {
  id: string;
  code: string;
  name: string;
}

// ---------------------------------------------------------------------
// Nội dung câu hỏi
// ---------------------------------------------------------------------

export interface RichContent {
  type?: string;
  format: 'HTML' | 'PLAIN_TEXT' | 'MARKDOWN';
  value: string;
}

export interface QuestionOption {
  id: string;
  code: string | null;
  content: string;
}

export interface QuestionSection {
  id: string;
  label: string;
  content: RichContent;
}

/**
 * answerKey và explanation chỉ có giá trị SAU khi nộp bài — backend lược bỏ
 * trong lúc đang làm.
 */
export interface AnswerKey {
  type: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  matches?: Record<string, string>;
  orderedOptionIds?: string[];
  acceptedValues?: string[];
  caseSensitive?: boolean;
}

export interface QuestionItem {
  id: string;
  sequenceNo: number;
  /** Backend lược field khi null, nên có thể vắng hẳn trong JSON. */
  prompt?: RichContent | null;
  responseType: ResponseType;
  required: boolean;
  maxScore: number;
  options: QuestionOption[];
  leftItems: QuestionOption[];
  rightItems: QuestionOption[];
  constraints: Record<string, unknown>;
  rubricCode: string | null;
  answerKey?: AnswerKey | null;
  explanation?: RichContent | null;
}

export interface AssetRef {
  assetId: string;
  role: string;
  displayOrder: number;
}

export interface QuestionSetSettings {
  shuffleOptions: boolean;
  shuffleItems: boolean;
  maxAudioPlays: number | null;
  showAnswerAfterEachItem: boolean;
  allowReview: boolean;
}

export interface QuestionSetContent {
  id: string;
  questionSetId: string;
  revision: number;
  schemaVersion: number;
  partId: string;
  taskTypeCode: string;
  title: string | null;
  instructions: string | null;
  accessLevel: AccessLevel;
  stimulus: RichContent | null;
  sections: QuestionSection[];
  items: QuestionItem[];
  assets: AssetRef[];
  settings: QuestionSetSettings;
  scoring: {
    strategy: string;
    partialCredit: boolean;
    maxScore: number;
  };
}

// ---------------------------------------------------------------------
// Lượt làm bài
// ---------------------------------------------------------------------

export interface ItemResponsePayload {
  itemId: string;
  responseType: ResponseType;
  selectedOptionId?: string | null;
  selectedOptionIds?: string[];
  matches?: Record<string, string>;
  orderedOptionIds?: string[];
  textValue?: string | null;
  recordingAssetId?: string | null;
}

export interface SavedResponse {
  status: string;
  answeredAt: string | null;
  itemResponses: ItemResponsePayload[];
}

export interface AttemptQuestionSet {
  attemptQuestionSetId: string;
  questionSetId: string;
  displayOrder: number;
  status: AttemptItemStatus;
  maxScore: number;
  awardedScore?: number | null;
  audioPlayCount: number;
  maxAudioPlays: number | null;
  /** Độ hot 1-5 do biên tập viên đặt; dùng để hiện ngọn lửa và lọc đề. */
  hotness: number | null;
  /** Năm ghi nhận đề ra thi, ví dụ 2026. null nếu chưa rõ. */
  examYear: number | null;
  content: QuestionSetContent;
  savedResponse: SavedResponse | null;
}

/** Kết quả chấm riêng một bộ giữa lượt; `content` đã tiết lộ đáp án của bộ đó. */
export interface QuestionSetScore {
  questionSetId: string;
  awardedScore: number;
  maxScore: number;
  correctItems: number;
  totalItems: number;
  itemScores: {
    itemId: string;
    rawScore: number;
    maxScore: number;
    correct: boolean;
  }[];
  content: QuestionSetContent;
}

export interface ComponentScore {
  componentId: string;
  componentCode: string;
  componentName: string;
  displayOrder: number;
  rawScore: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  scaledScore: number | null;
  cefrLevel: string | null;
}

export interface Attempt {
  id: string;
  mode: PracticeMode;
  status: AttemptStatus;
  accessLevelUsed: AccessLevel;
  componentId: string | null;
  partId: string | null;
  blueprintId: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  expiresAt: string | null;
  durationSeconds: number | null;
  timeSpentSeconds: number;
  totalItems: number;
  answeredItems: number;
  correctItems?: number;
  /** Điểm luyện tập do backend tính theo cấu hình đã lưu. */
  rawScore: number | null;
  maxScore: number | null;
  percentageScore: number | null;
  cefrLevel?: string | null;
  /**
   * Part là ngân hàng câu rời: mỗi bộ một câu, đề thi thật gộp nhiều câu
   * (Writing Part 1, Speaking Part 1). Ở đây không có "chủ đề" để chọn.
   */
  itemBankPart: boolean;
  componentScores?: ComponentScore[];
  /**
   * Tiến độ từng kỹ năng của bài thi đủ 5 kỹ năng. Rỗng khi luyện từng part.
   */
  componentProgress: ComponentProgress[];
  questionSets: AttemptQuestionSet[];
}

/**
 * Một kỹ năng trong bài thi đủ 5 kỹ năng: có đồng hồ riêng và khóa lại khi nộp.
 */
export interface ComponentProgress {
  componentId: string;
  componentCode: string;
  displayOrder: number;
  durationSeconds: number;
  /** null = chưa tới lượt kỹ năng này. */
  startedAt: string | null;
  expiresAt: string | null;
  /** Đã nộp: không sửa, không xem lại được nữa. */
  submittedAt: string | null;
}

export interface AttemptSummary {
  id: string;
  mode: PracticeMode;
  status: AttemptStatus;
  componentId: string | null;
  partId: string | null;
  createdAt: string;
  completedAt: string | null;
  percentageScore: number | null;
  totalItems: number;
  correctItems: number;
}

export interface CreatePartAttemptRequest {
  partId: string;
  questionSetCount?: number;
  /** Chỉ định đúng bộ cần làm, bỏ qua selector của backend. */
  questionSetIds?: string[];
  onlyIncorrect?: boolean;
  onlyNew?: boolean;
  timed?: boolean;
}

export interface CreateCustomAttemptRequest {
  componentIds?: string[];
  partIds?: string[];
  topicIds?: string[];
  cefrMin?: CefrLevel;
  cefrMax?: CefrLevel;
  difficultyMin?: number;
  difficultyMax?: number;
  questionSetCount?: number;
  /** Số bộ câu hỏi cần lấy chính xác theo từng Part cho bài test full kỹ năng. */
  partQuestionSetCounts?: Record<string, number>;
  onlyNew?: boolean;
  onlyIncorrect?: boolean;
  shuffle?: boolean;
  timed?: boolean;
}

// ---------------------------------------------------------------------
// Thanh toán
// ---------------------------------------------------------------------

export interface PlanFeature {
  code: string;
  value: string | null;
  displayName: string | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billingType: 'ONE_TIME' | 'RECURRING';
  /** null = trọn đời */
  durationDays: number | null;
  priceAmount: number;
  currency: string;
  features: PlanFeature[];
}

export interface OrderItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface Order {
  id: string;
  orderCode: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  expiresAt: string | null;
  paidAt: string | null;
  items: OrderItem[];
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  /** Chuyển hướng người dùng tới đây; Premium chỉ bật khi webhook xác nhận */
  paymentUrl: string | null;
  initiatedAt: string;
  completedAt: string | null;
}

export type BankTransferStatus =
  | 'PENDING'
  | 'CLAIMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'EXPIRED';

export interface BankTransferInstruction {
  id: string;
  orderId: string;
  orderCode: string | null;
  transferCode: string;
  amount: number;
  currency: string;
  status: BankTransferStatus;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferNote: string | null;
  /** Nội dung VietQR EMVCo; frontend vẽ thành ảnh để không phụ thuộc API trả phí. */
  qrContent: string | null;
  qrAssetId: string | null;
  qrExpiresAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
}

export interface Subscription {
  id: string;
  planCode: string | null;
  planName: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  lifetime: boolean;
}

export interface Entitlement {
  code: string;
  sourceType: string;
  startsAt: string;
  endsAt: string | null;
}

// ---------------------------------------------------------------------
// Thi thử
// ---------------------------------------------------------------------

export interface MockTestPart {
  partId: string;
  partName: string | null;
  componentCode: string | null;
  questionSetCount: number;
  displayOrder: number;
}

export interface MockTest {
  id: string;
  componentId: string | null;
  code: string;
  name: string;
  description: string | null;
  accessLevel: AccessLevel;
  durationSeconds: number | null;
  /** false → hiển thị ổ khóa và nút nâng cấp */
  canAccess: boolean;
  parts: MockTestPart[];
  totalQuestionSets: number;
}

// ---------------------------------------------------------------------
// Kết quả chấm AI
// ---------------------------------------------------------------------

export interface CriterionScore {
  code: string;
  name: string;
  score: number;
  maxScore: number;
  feedback: string | null;
}

export interface EvaluationFeedback {
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  correctedVersion: string | null;
}

export interface EvaluationResult {
  questionSetId: string;
  evaluatorType: string;
  model: string | null;
  totalScore: number;
  maxScore: number;
  cefrLevel: CefrLevel | null;
  transcript: string | null;
  criteria: CriterionScore[];
  feedback: EvaluationFeedback;
}

// ---------------------------------------------------------------------
// Asset
// ---------------------------------------------------------------------

export type AssetType =
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'USER_RECORDING'
  | 'AVATAR'
  | 'IMPORT_FILE'
  | 'EXPORT_FILE';

export interface UploadUrlResponse {
  assetId: string;
  uploadUrl: string;
  objectKey: string;
  bucket: string;
  expiresInSeconds: number;
}

export interface AssetResponse {
  id: string;
  assetType: AssetType;
  mimeType: string;
  status: string;
  fileSize: number | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  signedUrl: string | null;
}

// ---------------------------------------------------------------------
// Mẹo học
// ---------------------------------------------------------------------

/** Chuỗi tiêu đề đáp án của một đề Reading Part 4, theo thứ tự đoạn văn. */
export interface HeadingChain {
  questionSetId: string;
  questionSetCode: string;
  title: string;
  /** Tiêu đề đúng của đoạn 1..7. */
  headings: string[];
  /** Đoạn văn tương ứng, dùng để đối chiếu dấu hiệu paraphrase. */
  passages: string[];
  examYear: number | null;
  hotness: number | null;
}

/** Mã người nói của một chủ đề Listening Part 3. */
export interface SpeakerCode {
  questionSetId: string;
  questionSetCode: string;
  title: string;
  /** Bốn chữ số theo thứ tự bốn câu: Man=1, Woman=2, Both=0. */
  code: string;
  /** Tên người nói từng câu, dùng để tô màu và đọc thành lời. */
  speakers: string[];
  examYear: number | null;
  hotness: number | null;
}

// ---------------------------------------------------------------------
// Nhật ký cập nhật nội dung
// ---------------------------------------------------------------------

export interface ContentUpdateQuestionSet {
  questionSetId: string;
  code: string;
  title: string;
  itemCount: number;
}

export interface ContentUpdateLog {
  id: string;
  logDate: string;
  label: string;
  description: string;
  /** null = cập nhật chung, không gắn đề nào để làm. */
  partId: string | null;
  questionSets: ContentUpdateQuestionSet[];
}

// ---------------------------------------------------------------------
// Dự đoán đề
// ---------------------------------------------------------------------

export interface ExamPredictionItem {
  id: string;
  topicId: string;
  /** null = dự đoán cho cả kỹ năng, không riêng part nào. */
  partId: string | null;
  label: string;
  priority: 'HOT' | 'BACKUP';
  /** 0 = chưa có đề, client làm mờ và không cho bấm. */
  questionSetCount: number;
  /** Số lần chủ đề xuất hiện trong khoảng đang xem; chỉ có ở tab "hot nhất". */
  repeatCount: number;
  /**
   * Độ hot 1-5 sao, quy từ repeatCount so với chủ đề lặp nhiều nhất cùng bản
   * tin. Tab "hôm nay" không xếp hạng nên trả 0.
   */
  heatLevel: number;
  /**
   * Các part CÓ đề của chủ đề này. Writing Part 2/3/4 là cùng một club và đề
   * thi thật làm liền cả ba, nên client xin một bộ mỗi part.
   */
  partIds: string[];
}

/** Nhóm hiển thị trong kỹ năng: "Part 5", "Q16-17", "Part 2+3"... */
export interface ExamPredictionSection {
  sectionLabel: string;
  items: ExamPredictionItem[];
}

export interface ExamPredictionSkill {
  componentId: string;
  componentCode: string;
  componentName: string;
  displayOrder: number;
  topicCount: number;
  sections: ExamPredictionSection[];
}

export interface ExamPredictionFeed {
  /**
   * Ngày học viên đang xem — luôn là ngày mở trang. Bản tin chưa cập nhật thì
   * vẫn hiện ngày hôm nay, vì dự đoán còn giá trị cho tới khi có bản mới.
   */
  predictDate: string;
  /**
   * Ngày của bản tin gốc. Khác predictDate khi admin chưa đăng bản mới; dùng để
   * ghi chú "Cập nhật ngày…" cho học viên biết dự đoán lập từ hôm nào.
   */
  sourceDate: string | null;
  source: string | null;
  skills: ExamPredictionSkill[];
}

export interface AdminExamPrediction {
  id: string;
  predictDate: string;
  topicId: string;
  topicName: string | null;
  partId: string | null;
  partName: string | null;
  componentId: string;
  componentCode: string | null;
  priority: 'HOT' | 'BACKUP';
  label: string | null;
  sectionLabel: string | null;
  source: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  displayOrder: number;
  questionSetCount: number;
}

export interface SaveExamPredictionRequest {
  predictDate: string;
  topicId: string;
  partId?: string | null;
  componentId: string;
  priority?: 'HOT' | 'BACKUP';
  label?: string | null;
  sectionLabel?: string | null;
  source?: string | null;
  status?: 'DRAFT' | 'PUBLISHED';
  displayOrder?: number;
}

// ---------------------------------------------------------------------
// Bảng tin
// ---------------------------------------------------------------------

export interface NewsPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Object key của ảnh bìa; xin URL có chữ ký qua Asset API. */
  coverUrl: string | null;
  pinned: boolean;
  /** Có đề gắn kèm để bấm vào luyện ngay. */
  hasPractice: boolean;
  commentCount: number;
  viewCount: number;
  publishedAt: string | null;
}

/** Một đề gắn đích danh vào bài viết. */
export interface LinkedQuestionSet {
  questionSetId: string;
  title: string;
  partId: string | null;
  partLabel: string | null;
  /** false = phải mua gói mới làm được. */
  unlocked: boolean;
}

/** Đề thi thử đủ 4 phần gắn vào bài viết. */
export interface LinkedBlueprint {
  blueprintId: string;
  name: string;
  componentName: string | null;
  partCount: number;
  durationMinutes: number;
  /** false = phải mua gói mới làm được. */
  unlocked: boolean;
}

export interface NewsPostDetail extends NewsPostSummary {
  /** Markdown — render qua markdownToHtml rồi sanitizeHtml. */
  body: string;
  partId: string | null;
  partLabel: string | null;
  topicId: string | null;
  topicName: string | null;
  /** 0 thì ẩn nút luyện tập theo nhóm. */
  practiceSetCount: number;
  /**
   * Đề gắn đích danh, theo thứ tự người soạn đặt. Rỗng nghĩa là bài dùng lối
   * lọc theo Part/chủ đề, hoặc không gắn đề nào.
   */
  questionSets: LinkedQuestionSet[];
  /**
   * Đề thi thử đủ 4 phần. Hiện TRƯỚC questionSets: bài hướng dẫn cả kỹ năng thì
   * làm trọn đề mới đúng mạch.
   */
  blueprints: LinkedBlueprint[];
  commentsEnabled: boolean;
  /** Bình luận bài này phải chờ duyệt — báo trước cho học viên. */
  commentsModerated: boolean;
  /** false = phải mua gói mới bình luận được. */
  canComment: boolean;
  updatedAt: string | null;
}

export interface NewsComment {
  id: string;
  authorName: string;
  mine: boolean;
  /** Tác giả là quản trị viên — gắn nhãn để học viên tin nội dung. */
  fromAdmin: boolean;
  body: string;
  status: 'VISIBLE' | 'PENDING' | 'HIDDEN';
  /**
   * Chú thích hiện dưới bình luận chờ duyệt hoặc bị ẩn. Chỉ người viết nhận
   * được trường này, người khác không thấy cả bình luận.
   */
  statusNote: string | null;
  createdAt: string;
  replies: NewsComment[];
}

// ---------------------------------------------------------------------
// Giới thiệu (affiliate)
// ---------------------------------------------------------------------

export interface MyAffiliate {
  /** null khi chưa đủ điều kiện nhận mã. */
  code: string | null;
  /** Đã mua ít nhất một đơn nên đã được cấp mã. */
  eligible: boolean;
  commissionPercent: number;
  discountPercent: number;
  minPayoutAmount: number;
  totalEarned: number;
  totalPaid: number;
  /** Đang trong thời gian giữ, chưa rút được. */
  pendingAmount: number;
  availableAmount: number;
  /** Đã nằm trong một yêu cầu rút đang chờ duyệt. */
  lockedAmount: number;
  referralCount: number;
  hasOpenPayout: boolean;
}

export interface AffiliateReferral {
  id: string;
  referredName: string;
  /** Đã che bớt: người giới thiệu không cần thấy đủ email người khác. */
  referredEmail: string;
  joinedAt: string;
  totalCommission: number;
}

export type AffiliateCommissionStatus =
  | 'PENDING'
  | 'AVAILABLE'
  | 'LOCKED'
  | 'PAID'
  | 'CANCELLED';

export interface AffiliateCommission {
  id: string;
  orderCode: string;
  referredEmail: string;
  baseAmount: number;
  amount: number;
  commissionPercent: number;
  status: AffiliateCommissionStatus;
  availableAt: string | null;
  createdAt: string;
}

export type AffiliatePayoutStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface AffiliatePayout {
  id: string;
  amount: number;
  status: AffiliatePayoutStatus;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  note: string | null;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
}

export interface CheckAffiliateResult {
  valid: boolean;
  code: string | null;
  discountAmount: number;
  /** Lý do mã không dùng được, để hiện ngay dưới ô nhập. */
  message: string | null;
}

export interface AdminAffiliatePayout extends AffiliatePayout {
  userId: string;
  userName: string;
  userEmail: string;
  commissionCount: number;
}

export interface AdminAffiliateRow {
  userId: string;
  userName: string;
  userEmail: string;
  code: string;
  referralCount: number;
  paidOrderCount: number;
  totalEarned: number;
  totalPaid: number;
  availableAmount: number;
  status: string;
  /**
   * Mức riêng của người này; vắng mặt hoặc null = đang theo tỉ lệ chung.
   *
   * Backend bỏ trường null khỏi JSON nên phải kiểm tra bằng `!= null`.
   */
  commissionPercent?: number | null;
  discountPercent?: number | null;
  rateNote?: string | null;
  /** Mức thực tế đang áp, đã tính cả việc rơi về tỉ lệ chung. */
  effectiveCommissionPercent: number;
  effectiveDiscountPercent: number;
}

export interface SetAffiliateRatesBody {
  commissionPercent?: number | null;
  discountPercent?: number | null;
  rateNote?: string | null;
}

export interface AdminAffiliateOverview {
  totalAffiliates: number;
  totalReferrals: number;
  totalCommission: number;
  totalPaid: number;
  pendingPayoutCount: number;
  pendingPayoutAmount: number;
  topAffiliates: AdminAffiliateRow[];
}

export interface AffiliateSettings {
  commissionPercent: number;
  discountPercent: number;
  recurring: boolean;
  commissionOnGross: boolean;
  minPayoutAmount: number;
  holdDays: number;
  enabled: boolean;
}

// ---------------------------------------------------------------------
// Thống kê hành vi
// ---------------------------------------------------------------------

export interface PageRank {
  pageKey: string;
  label: string;
  views: number;
  uniqueUsers: number;
  /** Giây ở lại trung bình. */
  avgSeconds: number;
}

export interface AnalyticsOverview {
  days: number;
  totalViews: number;
  uniqueVisitors: number;
  pages: PageRank[];
}

export interface PageViewer {
  userId: string;
  email: string;
  fullName: string;
  views: number;
  lastViewedAt: string;
  hasPaid: boolean;
  premiumActive: boolean;
}

export interface DailyPoint {
  date: string;
  views: number;
  uniqueUsers: number;
}

export interface EntryPoint {
  pageKey: string;
  label: string;
  views: number;
}

export interface PageDetail {
  pageKey: string;
  label: string;
  views: number;
  uniqueUsers: number;
  daily: DailyPoint[];
  entryPoints: EntryPoint[];
  topViewers: PageViewer[];
}

export interface ConversionFunnel {
  days: number;
  viewedPlans: number;
  viewedCheckout: number;
  placedOrder: number;
  paidOrder: number;
  /** Người xem trang giá nhưng chưa từng mua. */
  viewedButNotPaid: PageViewer[];
}

// ---------------------------------------------------------------------
// Lớp học
// ---------------------------------------------------------------------

export interface Classroom {
  id: string;
  name: string;
  description: string | null;
  /** Mã 6 ký tự học viên nhập hoặc quét QR. */
  joinCode: string;
  joinEnabled: boolean;
  /** Lớp có được giao đề từ ngân hàng hệ thống không — admin bật. */
  systemContentEnabled: boolean;
  pricingType: 'FREE' | 'PAID';
  priceAmount: number;
  maxStudents: number;
  studentCount: number;
  status: string;
}

export interface ClassroomStudent {
  userId: string;
  fullName: string;
  email: string;
  /** Chữ cái đầu để vẽ avatar. */
  initial: string;
  attemptsDone: number;
  /**
   * Thang 10; vắng mặt khi học viên chưa làm bài nào.
   *
   * Backend đặt default-property-inclusion: non_null nên trường null bị bỏ
   * hẳn khỏi JSON — nhận về là undefined chứ không phải null. Khai cả hai để
   * chỗ dùng buộc phải kiểm tra bằng != null.
   */
  averageScore?: number | null;
  lastActiveAt?: string | null;
  paymentStatus: 'NOT_REQUIRED' | 'PENDING' | 'PAID';
  joinedAt: string;
}

export interface ClassProgress {
  componentCode: string;
  componentName: string;
  /** Phần trăm 0-100. */
  score: number;
}

export interface StudentClassroom {
  classroomId: string;
  name: string;
  teacherName: string;
  systemContentEnabled: boolean;
  pricingType: 'FREE' | 'PAID';
  priceAmount: number;
  paymentStatus: 'NOT_REQUIRED' | 'PENDING' | 'PAID';
  /** Đã trả tiền hoặc lớp miễn phí — được làm bài. */
  canPractice: boolean;
  joinedAt: string;
}

export interface AdminClassroom {
  id: string;
  name: string;
  teacherUserId: string;
  teacherName: string;
  teacherEmail: string;
  joinCode: string;
  studentCount: number;
  maxStudents: number;
  systemContentEnabled: boolean;
  pricingType: 'FREE' | 'PAID';
  priceAmount: number;
  status: string;
  createdAt: string;
}

export interface AdminTeacher {
  userId: string;
  fullName: string;
  email: string;
  classroomName: string;
  joinCode: string;
  studentCount: number;
  planCode: string | null;
  planEndsAt: string | null;
  status: string;
}

export interface CreateTeacherResult {
  userId: string;
  email: string;
  classroomId: string;
  joinCode: string;
}

export interface TeacherSettings {
  platformFeePercent: number;
  defaultMaxStudents: number;
}

export interface ClassroomMaterial {
  id: string;
  title: string;
  materialType: 'FILE' | 'LINK';
  assetId: string | null;
  linkUrl: string | null;
  createdAt: string;
}

export type ClassroomPostStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';

export interface ClassroomPost {
  id: string;
  title: string;
  excerpt?: string | null;
  /** Markdown. */
  content: string;
  /** Lấy link xem qua assetApi.signedUrl(). */
  coverAssetId?: string | null;
  pinned: boolean;
  status: ClassroomPostStatus;
  publishedAt?: string | null;
  createdAt: string;
}

export interface SaveClassroomPostBody {
  title: string;
  excerpt?: string | null;
  content?: string;
  coverAssetId?: string | null;
  pinned?: boolean;
  status?: ClassroomPostStatus;
}

export type ClassroomPredictionStatus = 'DRAFT' | 'PUBLISHED';
export type PredictionPriority = 'HOT' | 'BACKUP';

/** Một đề gắn đích danh vào mục dự đoán của lớp. */
export interface PredictionQuestionSet {
  id: string;
  title: string;
  partName: string;
  componentName: string;
  /** Đề do chính giáo viên soạn, không phải đề hệ thống. */
  own: boolean;
}

export interface ClassroomPrediction {
  id: string;
  componentId?: string | null;
  componentName?: string | null;
  /** Có chủ đề thì học viên bấm vào là mở được đề để luyện. */
  topicId?: string | null;
  topicName?: string | null;
  partId?: string | null;
  partName?: string | null;
  predictDate?: string | null;
  priority: PredictionPriority;
  label?: string | null;
  sectionLabel?: string | null;
  source?: string | null;
  status: ClassroomPredictionStatus;
  displayOrder: number;
  title: string;
  content?: string | null;
  questionSets: PredictionQuestionSet[];
  /** Số đề mở được: đề chỉ đích danh cộng đề cùng chủ đề. */
  openableCount: number;
  createdAt: string;
}

export interface SaveClassroomPredictionBody {
  componentId?: string | null;
  topicId?: string | null;
  partId?: string | null;
  predictDate?: string | null;
  priority?: PredictionPriority;
  label?: string | null;
  sectionLabel?: string | null;
  source?: string | null;
  status?: ClassroomPredictionStatus;
  displayOrder?: number;
  title: string;
  content?: string | null;
  /** Bỏ trống = giữ nguyên danh sách đề đang gắn. */
  questionSetIds?: string[];
}

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface Assignment {
  id: string;
  title: string;
  instructions: string | null;
  sourceType: 'QUESTION_SETS' | 'BLUEPRINT';
  blueprintId: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
  questionSetCount: number;
  submittedCount: number;
  totalStudents: number;
  overdue: boolean;
  createdAt: string;
}

export type SubmissionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'LATE'
  | 'GRADED';

export interface AssignmentSubmission {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  initial: string;
  attemptId: string | null;
  status: SubmissionStatus;
  submittedAt: string | null;
  /** Thang 10; null khi chưa chấm. */
  aiScore: number | null;
  teacherScore: number | null;
  teacherComment: string | null;
  gradedAt: string | null;
}

export interface StudentAssignment {
  id: string;
  classroomId: string;
  classroomName: string;
  title: string;
  instructions: string | null;
  dueAt: string | null;
  overdue: boolean;
  status: SubmissionStatus;
  attemptId: string | null;
  teacherScore: number | null;
  teacherComment: string | null;
}

export interface TeacherQuestionSet {
  id: string;
  title: string;
  partName: string;
  componentName: string;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Giáo viên tự soạn đề và ghép bài thi
// ---------------------------------------------------------------------

export type ContributionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/** Một đề giáo viên tự soạn. */
export interface TeacherAuthoredSet {
  id: string;
  code: string;
  title: string;
  partId?: string | null;
  partName: string;
  componentName: string;
  taskTypeCode?: string | null;
  itemCount: number;
  status: string;
  /** Vắng mặt = chưa từng đề xuất vào ngân hàng chung. */
  contributionStatus?: ContributionStatus | null;
  /** Lý do admin từ chối. */
  contributionNote?: string | null;
  createdAt: string;
}

/** FIXED = giáo viên chọn tay từng đề, RULES = hệ thống bốc theo luật. */
export type BlueprintSelectionMode = 'FIXED' | 'RULES';

export interface TeacherBlueprint {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  /** Rỗng = bài đủ 5 kỹ năng. */
  componentId?: string | null;
  componentName: string;
  selectionMode: BlueprintSelectionMode;
  durationSeconds?: number | null;
  status: string;
  questionSetCount: number;
  ruleCount: number;
  createdAt: string;
}

export interface BlueprintFixedSet {
  questionSetId: string;
  title: string;
  partId?: string | null;
  partName: string;
  componentName: string;
  displayOrder: number;
}

export interface BlueprintRule {
  partId: string;
  questionSetCount: number;
  difficultyMin?: number | null;
  difficultyMax?: number | null;
}

export interface SaveBlueprintBody {
  name: string;
  description?: string | null;
  /** Bỏ trống = bài đủ 5 kỹ năng. */
  componentId?: string | null;
  selectionMode: BlueprintSelectionMode;
  durationSeconds?: number | null;
  questionSetIds?: string[];
  rules?: BlueprintRule[];
}

/** Đề giáo viên đề xuất vào ngân hàng chung, phía admin. */
export interface QuestionSetContribution {
  id: string;
  questionSetId: string;
  questionSetTitle: string;
  questionSetCode: string;
  partName: string;
  componentName: string;
  teacherUserId: string;
  teacherName: string;
  teacherEmail: string;
  status: ContributionStatus;
  note?: string | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}
