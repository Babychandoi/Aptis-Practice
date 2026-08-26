import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { setAuthFailureHandler } from '@/api/client';
import { useAuthStore } from '@/features/auth/authStore';
import { AppLayout } from '@/app/AppLayout';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { PremiumRoute } from '@/app/PremiumRoute';
import { AdminRoute } from '@/features/admin/AdminRoute';

const TIPS_LOCK_MESSAGE =
  'Mẹo học thuộc gói Premium. Tài khoản miễn phí làm được 3 đề thi thử đầu của mỗi kỹ năng.';

const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const VerifyEmailPage = lazy(() => import('@/features/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const ProfilePage = lazy(() => import('@/features/auth/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const DashboardPage = lazy(() => import('@/features/catalog/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SkillListPage = lazy(() => import('@/features/catalog/SkillListPage').then((m) => ({ default: m.SkillListPage })));
const ContentUpdatePage = lazy(() => import('@/features/learning/ContentUpdatePage').then((m) => ({ default: m.ContentUpdatePage })));
const ExamPredictionPage = lazy(() => import('@/features/learning/ExamPredictionPage').then((m) => ({ default: m.ExamPredictionPage })));
const ComponentPage = lazy(() => import('@/features/catalog/ComponentPage').then((m) => ({ default: m.ComponentPage })));
const ComponentPartsPage = lazy(() => import('@/features/catalog/ComponentPartsPage').then((m) => ({ default: m.ComponentPartsPage })));
const ComponentTestsPage = lazy(() => import('@/features/catalog/ComponentTestsPage').then((m) => ({ default: m.ComponentTestsPage })));
const ComponentTestIntroPage = lazy(() => import('@/features/catalog/ComponentTestIntroPage').then((m) => ({ default: m.ComponentTestIntroPage })));
const PartPage = lazy(() => import('@/features/catalog/PartPage').then((m) => ({ default: m.PartPage })));
const MockTestPage = lazy(() => import('@/features/practice/MockTestPage').then((m) => ({ default: m.MockTestPage })));
const AttemptPage = lazy(() => import('@/features/practice/AttemptPage').then((m) => ({ default: m.AttemptPage })));
const AttemptResultPage = lazy(() => import('@/features/practice/AttemptResultPage').then((m) => ({ default: m.AttemptResultPage })));
const HistoryPage = lazy(() => import('@/features/practice/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const PlansPage = lazy(() => import('@/features/billing/PlansPage').then((m) => ({ default: m.PlansPage })));
const CheckoutPage = lazy(() => import('@/features/billing/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const StudyTipsHomePage = lazy(() => import('@/features/learning/StudyTipsHomePage').then((m) => ({ default: m.StudyTipsHomePage })));
const StudyTipsListeningPart3Page = lazy(() => import('@/features/learning/StudyTipsListeningPart3Page').then((m) => ({ default: m.StudyTipsListeningPart3Page })));
const StudyTipsReadingPage = lazy(() => import('@/features/learning/StudyTipsReadingPage').then((m) => ({ default: m.StudyTipsReadingPage })));
const StudyTipsWritingPage = lazy(() => import('@/features/learning/StudyTipsWritingPage').then((m) => ({ default: m.StudyTipsWritingPage })));
const StudyTipsSpeakingPage = lazy(() => import('@/features/learning/StudyTipsSpeakingPage').then((m) => ({ default: m.StudyTipsSpeakingPage })));
const NotFoundPage = lazy(() => import('@/app/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const QuestionSetListPage = lazy(() => import('@/features/admin/QuestionSetListPage').then((m) => ({ default: m.QuestionSetListPage })));
const QuestionSetDetailPage = lazy(() => import('@/features/admin/QuestionSetDetailPage').then((m) => ({ default: m.QuestionSetDetailPage })));
const QuestionSetEditorPage = lazy(() => import('@/features/admin/QuestionSetEditorPage').then((m) => ({ default: m.QuestionSetEditorPage })));
const ImportAdminPage = lazy(() => import('@/features/admin/ImportAdminPage').then((m) => ({ default: m.ImportAdminPage })));
const PlanAdminPage = lazy(() => import('@/features/admin/PlanAdminPage').then((m) => ({ default: m.PlanAdminPage })));
const OrderAdminPage = lazy(() => import('@/features/admin/OrderAdminPage').then((m) => ({ default: m.OrderAdminPage })));
const RefundAdminPage = lazy(() => import('@/features/admin/RefundAdminPage').then((m) => ({ default: m.RefundAdminPage })));
const ReportAdminPage = lazy(() => import('@/features/admin/ReportAdminPage').then((m) => ({ default: m.ReportAdminPage })));
const BankTransferAdminPage = lazy(() => import('@/features/admin/BankTransferAdminPage').then((m) => ({ default: m.BankTransferAdminPage })));
const UserAdminPage = lazy(() => import('@/features/admin/UserAdminPage').then((m) => ({ default: m.UserAdminPage })));
const ScoringConfigPage = lazy(() => import('@/features/admin/ScoringConfigPage').then((m) => ({ default: m.ScoringConfigPage })));
const SkillTestAdminPage = lazy(() => import('@/features/admin/SkillTestAdminPage').then((m) => ({ default: m.SkillTestAdminPage })));
const ExamPredictionAdminPage = lazy(() => import('@/features/admin/ExamPredictionAdminPage').then((m) => ({ default: m.ExamPredictionAdminPage })));

export function App() {
  const navigate = useNavigate();
  const { restore, initializing, clear } = useAuthStore();

  useEffect(() => {
    void restore();
  }, [restore]);

  // Refresh token hết hiệu lực → về trang đăng nhập, không để app treo ở lỗi 401
  useEffect(() => {
    setAuthFailureHandler((reason) => {
      clear();
      // Truyền lý do qua state để trang đăng nhập giải thích được vì sao bị
      // đẩy ra — "hết phiên" và "đăng nhập ở máy khác" cần nói khác nhau.
      navigate('/login', { replace: true, state: { authFailure: reason } });
    });
  }, [navigate, clear]);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Đang tải…</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Đang tải…</div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        {/* Mục lục kỹ năng cho thanh nav mobile; phải đứng trước route
            :componentSlug để "/luyen-tap" không bị hiểu là một slug. */}
        <Route path="/luyen-tap" element={<SkillListPage />} />
        {/* Trang tự xử lý 403 để hiện PremiumGate kèm ngữ cảnh, nên không bọc
            PremiumRoute — bọc thêm sẽ chặn trước khi gọi API và mất mô tả. */}
        <Route path="/cap-nhat-de" element={<ContentUpdatePage />} />
        {/* Cũng tự xử lý 403 để hiện PremiumGate, nên không bọc PremiumRoute. */}
        <Route path="/du-doan-de" element={<ExamPredictionPage />} />
        <Route path="/luyen-tap/:componentSlug" element={<ComponentPage />} />
        <Route path="/luyen-tap/:componentSlug/theo-part" element={<ComponentPartsPage />} />
        <Route path="/luyen-tap/:componentSlug/bai-test" element={<ComponentTestsPage />} />
        <Route path="/luyen-tap/:componentSlug/bai-test/:blueprintId/gioi-thieu" element={<ComponentTestIntroPage />} />
        <Route path="/luyen-tap/:componentSlug/:partSlug" element={<PartPage />} />
        <Route path="/components/:componentId" element={<ComponentPage />} />
        <Route path="/parts/:partId" element={<PartPage />} />
        <Route path="/practice/custom" element={<Navigate to="/mock-tests" replace />} />
        <Route path="/mock-tests" element={<MockTestPage />} />
        <Route path="/attempts/:attemptId" element={<AttemptPage />} />
        <Route path="/attempts/:attemptId/result" element={<AttemptResultPage />} />
        {/* Mục lục mẹo học mở cho mọi người: nó chỉ là danh sách kỹ năng, không
            chứa đáp án. Từng thẻ tự khóa và dẫn sang trang gói — cho học viên
            miễn phí thấy được sẽ mở ra những gì, thay vì một trang trắng.
            Các trang chi tiết bên dưới mới là nội dung Premium. */}
        <Route path="/meo-hoc" element={<StudyTipsHomePage />} />
        <Route path="/meo-hoc/nghe-phan-3" element={<PremiumRoute message={TIPS_LOCK_MESSAGE}><StudyTipsListeningPart3Page /></PremiumRoute>} />
        <Route path="/meo-hoc/doc" element={<PremiumRoute message={TIPS_LOCK_MESSAGE}><StudyTipsReadingPage /></PremiumRoute>} />
        <Route path="/meo-hoc/viet" element={<PremiumRoute message={TIPS_LOCK_MESSAGE}><StudyTipsWritingPage /></PremiumRoute>} />
        <Route path="/meo-hoc/noi" element={<PremiumRoute message={TIPS_LOCK_MESSAGE}><StudyTipsSpeakingPage /></PremiumRoute>} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/checkout/:orderId" element={<CheckoutPage />} />
        <Route path="/profile" element={<ProfilePage />} />

      </Route>

      {/* Admin dùng app shell riêng; client chặn theo permission, backend chặn bằng @PreAuthorize. */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/question-sets" replace />} />
        <Route path="question-sets" element={<QuestionSetListPage />} />
        <Route path="question-sets/skills/:componentId" element={<QuestionSetListPage />} />
        <Route path="question-sets/skills/:componentId/parts/:partId" element={<QuestionSetListPage />} />
        <Route path="question-sets/new" element={<QuestionSetEditorPage />} />
        <Route path="question-sets/:id/edit" element={<QuestionSetEditorPage />} />
        <Route path="question-sets/:id" element={<QuestionSetDetailPage />} />
        <Route path="scoring" element={<ScoringConfigPage />} />
        <Route path="skill-tests" element={<SkillTestAdminPage />} />
        <Route path="exam-predictions" element={<ExamPredictionAdminPage />} />
        <Route path="imports" element={<ImportAdminPage />} />
        <Route path="plans" element={<PlanAdminPage />} />
        <Route path="orders" element={<OrderAdminPage />} />
        <Route path="bank-transfers" element={<BankTransferAdminPage />} />
        <Route path="refunds" element={<RefundAdminPage />} />
        <Route path="users" element={<UserAdminPage />} />
        <Route path="reports" element={<ReportAdminPage />} />
      </Route>

      {/* Fallback cuối: nói rõ không tìm thấy thay vì âm thầm đá về trang chủ */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  );
}
