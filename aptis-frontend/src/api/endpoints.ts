import { api } from './client';
import type {
  Assignment,
  AssignmentSubmission,
  ClassroomMaterial,
  ClassroomPost,
  ClassroomPrediction,
  SaveClassroomPostBody,
  SaveClassroomPredictionBody,
  StudentAssignment,
  TeacherQuestionSet,
  AdminClassroom,
  AdminTeacher,
  ClassProgress,
  Classroom,
  ClassroomStudent,
  CreateTeacherResult,
  StudentClassroom,
  TeacherSettings,
  AnalyticsOverview,
  ConversionFunnel,
  PageDetail,
  PageRank,
  AdminAffiliateOverview,
  AdminAffiliatePayout,
  AdminAffiliateRow,
  SetAffiliateRatesBody,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateReferral,
  AffiliateSettings,
  CheckAffiliateResult,
  MyAffiliate,
  Attempt,
  AttemptSummary,
  AssetResponse,
  AuthConfigResponse,
  AdminExamPrediction,
  ContentUpdateLog,
  ExamPredictionFeed,
  SaveExamPredictionRequest,
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
  HeadingChain,
  SpeakerCode,
  NewsComment,
  NewsPostDetail,
  NewsPostSummary,
  TeacherAuthoredSet,
  TeacherBlueprint,
  BlueprintFixedSet,
  BlueprintRule,
  SaveBlueprintBody,
  QuestionSetContribution,
} from '@/types/api';
import type {
  AdminQuestionSet,
  CreateQuestionSetRequest,
  PreviewResult,
  UpdateQuestionSetRequest,
} from '@/types/admin';

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

export const authApi = {
  register: (body: { email: string; password: string; fullName?: string }) =>
    api.post<void>('/auth/register', body).then((r) => r.data),

  verifyEmail: (token: string) =>
    api.post<void>('/auth/verify-email', { token }).then((r) => r.data),

  /**
   * Gửi lại email xác thực. Luôn trả 202 dù email không tồn tại, đã xác thực
   * rồi, hay bị chặn vì gửi quá nhiều — đừng suy ra trạng thái tài khoản từ
   * phản hồi này.
   */
  resendVerification: (email: string) =>
    api.post<void>('/auth/resend-verification', { email }).then((r) => r.data),

  login: (body: { email: string; password: string; deviceId?: string }) =>
    api.post<TokenResponse>('/auth/login', body).then((r) => r.data),

  /** Cấu hình đăng nhập ngoài: googleClientId rỗng = chưa bật. */
  config: () =>
    api.get<AuthConfigResponse>('/auth/config').then((r) => r.data),

  /** Đổi ID token của Google sang token của hệ thống. */
  googleLogin: (body: { idToken: string; deviceId?: string }) =>
    api.post<TokenResponse>('/auth/google', body).then((r) => r.data),

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

  /**
   * Bắt đầu một kỹ năng — đồng hồ của kỹ năng chỉ chạy từ lúc này, nên thời gian
   * đọc hướng dẫn ở màn chuyển tiếp không bị tính vào.
   */
  beginComponent: (attemptId: string, componentId: string) =>
    api
      .post<Attempt>(`/attempts/${attemptId}/components/${componentId}/begin`)
      .then((r) => r.data),

  /**
   * Nộp một kỹ năng trong bài thi đủ 5 kỹ năng: khóa kỹ năng đó. Kỹ năng kế tiếp
   * chờ học viên bấm bắt đầu. Nộp kỹ năng cuối thì backend nộp luôn cả lượt.
   */
  submitComponent: (attemptId: string, componentId: string) =>
    api
      .post<Attempt>(`/attempts/${attemptId}/components/${componentId}/submit`)
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
  /** Danh sách đề thi thử, phân trang phía server. */
  list: (componentId?: string, page = 0, size = 20) =>
    api.get<PageResponse<MockTest>>('/mock-tests', { params: { componentId, page, size } })
      .then((r) => r.data),

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
  createOrder: (
    body: { planId: string; promotionCode?: string; affiliateCode?: string },
    idempotencyKey: string,
  ) =>
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

// ---------------------------------------------------------------------

export const studyTipsApi = {
  /** Bảng mã người nói Listening Part 3, sinh từ đáp án trong ngân hàng đề. */
  listeningPart3: () =>
    api.get<SpeakerCode[]>('/study-tips/listening-part-3').then((r) => r.data),

  /** Chuỗi người nói đáp án Reading Part 3. */
  readingPart3: () =>
    api.get<HeadingChain[]>('/study-tips/reading-part-3').then((r) => r.data),

  /** Chuỗi tiêu đề đáp án Reading Part 4, theo thứ tự đoạn văn. */
  readingPart4: () =>
    api.get<HeadingChain[]>('/study-tips/reading-part-4').then((r) => r.data),
};

// ---------------------------------------------------------------------
// Nhật ký cập nhật nội dung
// ---------------------------------------------------------------------

export const contentUpdateApi = {
  /** Timeline các đợt cập nhật đề. Chỉ Premium gọi được (backend trả 403). */
  list: () => api.get<ContentUpdateLog[]>('/content-updates').then((r) => r.data),
};

// ---------------------------------------------------------------------
// Dự đoán đề
// ---------------------------------------------------------------------

export const examPredictionApi = {
  /** Bản tin của một ngày; bỏ trống date thì backend lấy hôm nay. */
  today: (date?: string) =>
    api
      .get<ExamPredictionFeed>('/exam-predictions', { params: date ? { date } : undefined })
      .then((r) => r.data),

  /** Chủ đề lặp nhiều nhất trong N tháng gần đây. */
  hottest: (months = 2) =>
    api
      .get<ExamPredictionFeed>('/exam-predictions/hottest', { params: { months } })
      .then((r) => r.data),
};

export const adminExamPredictionApi = {
  list: (date?: string) =>
    api
      .get<AdminExamPrediction[]>('/admin/exam-predictions', { params: date ? { date } : undefined })
      .then((r) => r.data),

  create: (body: SaveExamPredictionRequest) =>
    api.post<AdminExamPrediction>('/admin/exam-predictions', body).then((r) => r.data),

  update: (id: string, body: SaveExamPredictionRequest) =>
    api.put<AdminExamPrediction>(`/admin/exam-predictions/${id}`, body).then((r) => r.data),

  remove: (id: string) => api.delete<void>(`/admin/exam-predictions/${id}`).then(() => undefined),
};

/**
 * Bảng tin. Đọc không cần đăng nhập (xem SecurityConfig), bình luận cần Premium.
 */
export const newsApi = {
  feed: (params: { page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<NewsPostSummary>>('/news', { params: { page: 0, size: 10, ...params } })
      .then((r) => r.data),

  detail: (slug: string) => api.get<NewsPostDetail>(`/news/${slug}`).then((r) => r.data),

  comments: (postId: string, params: { page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<NewsComment>>(`/news/${postId}/comments`, {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  addComment: (postId: string, body: string, parentId?: string) =>
    api
      .post<NewsComment>(`/news/${postId}/comments`, { body, parentId })
      .then((r) => r.data),

  deleteComment: (commentId: string) => api.delete(`/news/comments/${commentId}`),
};

// ---------------------------------------------------------------------
// Giới thiệu (affiliate)
// ---------------------------------------------------------------------

export const affiliateApi = {
  me: () => api.get<MyAffiliate>('/affiliate/me').then((r) => r.data),

  /** Trả 200 kèm valid=false khi mã sai, không ném lỗi. */
  check: (code: string, planId: string) =>
    api
      .get<CheckAffiliateResult>('/affiliate/check', { params: { code, planId } })
      .then((r) => r.data),

  referrals: (page = 0, size = 20) =>
    api
      .get<PageResponse<AffiliateReferral>>('/affiliate/referrals', { params: { page, size } })
      .then((r) => r.data),

  commissions: (page = 0, size = 20) =>
    api
      .get<PageResponse<AffiliateCommission>>('/affiliate/commissions', { params: { page, size } })
      .then((r) => r.data),

  payouts: (page = 0, size = 20) =>
    api
      .get<PageResponse<AffiliatePayout>>('/affiliate/payouts', { params: { page, size } })
      .then((r) => r.data),

  requestPayout: (body: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    note?: string;
  }) => api.post<AffiliatePayout>('/affiliate/payouts', body).then((r) => r.data),
};

export const adminAffiliateApi = {
  overview: () =>
    api.get<AdminAffiliateOverview>('/admin/affiliate/overview').then((r) => r.data),

  accounts: (page = 0, size = 20) =>
    api
      .get<PageResponse<AdminAffiliateRow>>('/admin/affiliate/accounts', {
        params: { page, size },
      })
      .then((r) => r.data),

  /** Đặt mức hoa hồng/giảm giá riêng; null một trường = trả về mức chung. */
  setRates: (userId: string, body: SetAffiliateRatesBody) =>
    api
      .put<AdminAffiliateRow>(`/admin/affiliate/accounts/${userId}/rates`, body)
      .then((r) => r.data),

  payouts: (params: { status?: string; page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<AdminAffiliatePayout>>('/admin/affiliate/payouts', { params })
      .then((r) => r.data),

  approve: (payoutId: string, adminNote?: string) =>
    api
      .post<AffiliatePayout>(`/admin/affiliate/payouts/${payoutId}/approve`, { adminNote })
      .then((r) => r.data),

  reject: (payoutId: string, adminNote?: string) =>
    api
      .post<AffiliatePayout>(`/admin/affiliate/payouts/${payoutId}/reject`, { adminNote })
      .then((r) => r.data),

  markPaid: (payoutId: string, adminNote?: string) =>
    api
      .post<AffiliatePayout>(`/admin/affiliate/payouts/${payoutId}/paid`, { adminNote })
      .then((r) => r.data),

  backfill: () =>
    api
      .post<{ granted: number }>('/admin/affiliate/backfill')
      .then((r) => r.data),

  settings: () =>
    api.get<AffiliateSettings>('/admin/affiliate/settings').then((r) => r.data),

  updateSettings: (body: AffiliateSettings) =>
    api.put<AffiliateSettings>('/admin/affiliate/settings', body).then((r) => r.data),
};

export const adminAnalyticsApi = {
  overview: (days = 30) =>
    api
      .get<AnalyticsOverview>('/admin/analytics/overview', { params: { days } })
      .then((r) => r.data),

  pageDetail: (pageKey: string, days = 30) =>
    api
      .get<PageDetail>(`/admin/analytics/pages/${pageKey}`, { params: { days } })
      .then((r) => r.data),

  conversion: (days = 30) =>
    api
      .get<ConversionFunnel>('/admin/analytics/conversion', { params: { days } })
      .then((r) => r.data),

  userInterests: (userId: string, days = 90) =>
    api
      .get<PageRank[]>(`/admin/analytics/users/${userId}`, { params: { days } })
      .then((r) => r.data),
};

// ---------------------------------------------------------------------
// Lớp học
// ---------------------------------------------------------------------

export const teacherClassroomApi = {
  myClassroom: () => api.get<Classroom>('/teacher/classroom').then((r) => r.data),

  students: () =>
    api.get<ClassroomStudent[]>('/teacher/classroom/students').then((r) => r.data),

  progress: () =>
    api.get<ClassProgress[]>('/teacher/classroom/progress').then((r) => r.data),

  update: (body: { name?: string; description?: string }) =>
    api.put<Classroom>('/teacher/classroom', body).then((r) => r.data),

  updatePricing: (body: { pricingType: 'FREE' | 'PAID'; priceAmount: number }) =>
    api.put<Classroom>('/teacher/classroom/pricing', body).then((r) => r.data),

  updateSupport: (body: {
    supportZalo?: string;
    supportFacebook?: string;
    supportGroup?: string;
    supportNote?: string;
  }) => api.put<Classroom>('/teacher/classroom/support', body).then((r) => r.data),

  setJoinEnabled: (joinEnabled: boolean) =>
    api.put<Classroom>('/teacher/classroom/join-enabled', { joinEnabled }).then((r) => r.data),

  removeStudent: (studentUserId: string) =>
    api.delete(`/teacher/classroom/students/${studentUserId}`).then((r) => r.data),

  /** Lịch sử luyện tập của một học viên, kể cả bài em tự làm với đề hệ thống. */
  studentAttempts: (studentUserId: string, page = 0, size = 20) =>
    api
      .get<PageResponse<AttemptSummary>>(
        `/teacher/classroom/students/${studentUserId}/attempts`,
        { params: { page, size } },
      )
      .then((r) => r.data),

  /** Chi tiết một lượt: em chọn đáp án nào, đúng sai ra sao. */
  studentAttemptDetail: (studentUserId: string, attemptId: string) =>
    api
      .get<Attempt>(`/teacher/classroom/students/${studentUserId}/attempts/${attemptId}`)
      .then((r) => r.data),

  /** Nhận xét AI của bài Speaking/Writing em đã làm. */
  studentAttemptEvaluations: (studentUserId: string, attemptId: string) =>
    api
      .get<EvaluationResult[]>(
        `/teacher/classroom/students/${studentUserId}/attempts/${attemptId}/evaluations`,
      )
      .then((r) => r.data),
};

export const teacherContentApi = {
  materials: () =>
    api.get<ClassroomMaterial[]>('/teacher/classroom/materials').then((r) => r.data),

  addMaterial: (body: {
    title: string;
    materialType: 'FILE' | 'LINK';
    assetId?: string;
    linkUrl?: string;
  }) => api.post<ClassroomMaterial>('/teacher/classroom/materials', body).then((r) => r.data),

  deleteMaterial: (id: string) =>
    api.delete(`/teacher/classroom/materials/${id}`).then((r) => r.data),

  /** Giáo viên thấy cả bài nháp và bài đã ẩn. */
  posts: () => api.get<ClassroomPost[]>('/teacher/classroom/posts').then((r) => r.data),

  post: (id: string) =>
    api.get<ClassroomPost>(`/teacher/classroom/posts/${id}`).then((r) => r.data),

  addPost: (body: SaveClassroomPostBody) =>
    api.post<ClassroomPost>('/teacher/classroom/posts', body).then((r) => r.data),

  updatePost: (id: string, body: SaveClassroomPostBody) =>
    api.put<ClassroomPost>(`/teacher/classroom/posts/${id}`, body).then((r) => r.data),

  deletePost: (id: string) => api.delete(`/teacher/classroom/posts/${id}`).then((r) => r.data),

  predictions: () =>
    api.get<ClassroomPrediction[]>('/teacher/classroom/predictions').then((r) => r.data),

  addPrediction: (body: SaveClassroomPredictionBody) =>
    api.post<ClassroomPrediction>('/teacher/classroom/predictions', body).then((r) => r.data),

  updatePrediction: (id: string, body: SaveClassroomPredictionBody) =>
    api
      .put<ClassroomPrediction>(`/teacher/classroom/predictions/${id}`, body)
      .then((r) => r.data),

  deletePrediction: (id: string) =>
    api.delete(`/teacher/classroom/predictions/${id}`).then((r) => r.data),

  assignments: () =>
    api.get<Assignment[]>('/teacher/classroom/assignments').then((r) => r.data),

  createAssignment: (body: {
    title: string;
    instructions?: string;
    questionSetIds?: string[];
    blueprintId?: string;
    dueAt?: string;
    /** Để trống = giao cả lớp; có id = chỉ giao cho những em đó. */
    recipientUserIds?: string[];
  }) => api.post<Assignment>('/teacher/classroom/assignments', body).then((r) => r.data),

  closeAssignment: (id: string) =>
    api.post(`/teacher/classroom/assignments/${id}/close`).then((r) => r.data),

  deleteAssignment: (id: string) =>
    api.delete(`/teacher/classroom/assignments/${id}`).then((r) => r.data),

  submissions: (assignmentId: string) =>
    api
      .get<AssignmentSubmission[]>(`/teacher/classroom/assignments/${assignmentId}/submissions`)
      .then((r) => r.data),

  grade: (submissionId: string, body: { teacherScore?: number | null; comment?: string }) =>
    api.post(`/teacher/classroom/submissions/${submissionId}/grade`, body).then((r) => r.data),

  myQuestionSets: () =>
    api.get<TeacherQuestionSet[]>('/teacher/classroom/question-sets').then((r) => r.data),
};

export const studentWorkspaceApi = {
  assignments: (classroomId: string) =>
    api.get<StudentAssignment[]>(`/classrooms/${classroomId}/assignments`).then((r) => r.data),

  start: (classroomId: string, assignmentId: string) =>
    api
      .post<{ attemptId: string }>(`/classrooms/${classroomId}/assignments/${assignmentId}/start`)
      .then((r) => r.data),

  materials: (classroomId: string) =>
    api.get<ClassroomMaterial[]>(`/classrooms/${classroomId}/materials`).then((r) => r.data),

  posts: (classroomId: string) =>
    api.get<ClassroomPost[]>(`/classrooms/${classroomId}/posts`).then((r) => r.data),

  predictions: (classroomId: string) =>
    api.get<ClassroomPrediction[]>(`/classrooms/${classroomId}/predictions`).then((r) => r.data),

  /**
   * Mở lượt luyện từ một mục dự đoán của lớp.
   *
   * <p>Đi đường riêng chứ không dùng /practice/custom-attempts: học viên trong
   * lớp làm được đề của lớp kể cả khi chưa mua Premium.
   */
  practicePrediction: (classroomId: string, predictionId: string) =>
    api
      .post<{ attemptId: string }>(
        `/classrooms/${classroomId}/predictions/${predictionId}/practice`,
      )
      .then((r) => r.data),
};

export const studentClassroomApi = {
  mine: () => api.get<StudentClassroom[]>('/classrooms/mine').then((r) => r.data),

  join: (joinCode: string) =>
    api.post<StudentClassroom>('/classrooms/join', { joinCode }).then((r) => r.data),
};

export const adminClassroomApi = {
  list: (page = 0, size = 20) =>
    api
      .get<PageResponse<AdminClassroom>>('/admin/classrooms', { params: { page, size } })
      .then((r) => r.data),

  teachers: () => api.get<AdminTeacher[]>('/admin/classrooms/teachers').then((r) => r.data),

  createTeacher: (body: {
    fullName: string;
    email: string;
    password: string;
    classroomName?: string;
    planCode?: string;
  }) => api.post<CreateTeacherResult>('/admin/classrooms/teachers', body).then((r) => r.data),

  updateTeacher: (
    teacherUserId: string,
    body: { fullName?: string; classroomName?: string; newPassword?: string },
  ) => api.put(`/admin/classrooms/teachers/${teacherUserId}`, body).then((r) => r.data),

  toggleSystemContent: (classroomId: string, enabled: boolean) =>
    api
      .put<AdminClassroom>(`/admin/classrooms/${classroomId}/system-content`, { enabled })
      .then((r) => r.data),

  setMaxStudents: (classroomId: string, maxStudents: number | null) =>
    api
      .put<AdminClassroom>(`/admin/classrooms/${classroomId}/max-students`, { maxStudents })
      .then((r) => r.data),

  settings: () => api.get<TeacherSettings>('/admin/classrooms/settings').then((r) => r.data),

  updateSettings: (body: TeacherSettings) =>
    api.put<TeacherSettings>('/admin/classrooms/settings', body).then((r) => r.data),
};

// ---------------------------------------------------------------------
// Giáo viên tự soạn đề và ghép bài thi
// ---------------------------------------------------------------------

/**
 * Soạn đề của giáo viên.
 *
 * <p>Cùng hình dạng với adminContentApi để trình soạn dùng chung được cho cả
 * hai bên — chỉ khác đường dẫn và việc đề gắn chủ sở hữu.
 */
export const teacherAuthoringApi = {
  /** Đề giáo viên đã soạn, kèm trạng thái đề xuất vào kho chung. */
  list: () =>
    api.get<TeacherAuthoredSet[]>('/teacher/question-sets').then((r) => r.data),

  detail: (id: string) =>
    api.get<AdminQuestionSet>(`/teacher/question-sets/${id}`).then((r) => r.data),

  /**
   * Xem trước nội dung một đề trước khi chọn giao hoặc ghép.
   *
   * Khác `detail` ở chỗ đề hệ thống cũng xem được, miễn lớp đã bật kho đề.
   */
  preview: (id: string) =>
    api.get<PreviewResult>(`/teacher/question-sets/${id}/preview`).then((r) => r.data),

  create: (body: CreateQuestionSetRequest) =>
    api.post<AdminQuestionSet>('/teacher/question-sets', body).then((r) => r.data),

  update: (id: string, body: UpdateQuestionSetRequest) =>
    api.patch<AdminQuestionSet>(`/teacher/question-sets/${id}`, body).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/teacher/question-sets/${id}`).then((r) => r.data),

  /** Gửi đề cho quản trị viên xem xét đưa vào ngân hàng chung. */
  contribute: (id: string, note?: string) =>
    api
      .post<{ status: string }>(`/teacher/question-sets/${id}/contribute`, { note })
      .then((r) => r.data),
};

/** Bài thi giáo viên tự ghép: full một kỹ năng hoặc đủ 5 kỹ năng. */
export const teacherBlueprintApi = {
  list: () => api.get<TeacherBlueprint[]>('/teacher/blueprints').then((r) => r.data),

  questionSets: (id: string) =>
    api
      .get<BlueprintFixedSet[]>(`/teacher/blueprints/${id}/question-sets`)
      .then((r) => r.data),

  rules: (id: string) =>
    api.get<BlueprintRule[]>(`/teacher/blueprints/${id}/rules`).then((r) => r.data),

  create: (body: SaveBlueprintBody) =>
    api.post<TeacherBlueprint>('/teacher/blueprints', body).then((r) => r.data),

  update: (id: string, body: SaveBlueprintBody) =>
    api.put<TeacherBlueprint>(`/teacher/blueprints/${id}`, body).then((r) => r.data),

  remove: (id: string) => api.delete(`/teacher/blueprints/${id}`).then((r) => r.data),
};

/** Admin duyệt đề giáo viên đề xuất vào ngân hàng chung. */
export const adminContributionApi = {
  list: (params: { status?: string; page?: number; size?: number } = {}) =>
    api
      .get<PageResponse<QuestionSetContribution>>('/admin/question-set-contributions', {
        params: { page: 0, size: 20, ...params },
      })
      .then((r) => r.data),

  accept: (id: string, adminNote?: string) =>
    api
      .post<QuestionSetContribution>(
        `/admin/question-set-contributions/${id}/accept`,
        { adminNote },
      )
      .then((r) => r.data),

  reject: (id: string, adminNote?: string) =>
    api
      .post<QuestionSetContribution>(
        `/admin/question-set-contributions/${id}/reject`,
        { adminNote },
      )
      .then((r) => r.data),
};
