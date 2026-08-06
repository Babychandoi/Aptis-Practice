import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { setAuthFailureHandler } from '@/api/client';
import { useAuthStore } from '@/features/auth/authStore';
import { AppLayout } from '@/app/AppLayout';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { DashboardPage } from '@/features/catalog/DashboardPage';
import { ComponentPage } from '@/features/catalog/ComponentPage';
import { ComponentPartsPage } from '@/features/catalog/ComponentPartsPage';
import { ComponentTestsPage } from '@/features/catalog/ComponentTestsPage';
import { ComponentTestIntroPage } from '@/features/catalog/ComponentTestIntroPage';
import { PartPage } from '@/features/catalog/PartPage';
import { MockTestPage } from '@/features/practice/MockTestPage';
import { AttemptPage } from '@/features/practice/AttemptPage';
import { AttemptResultPage } from '@/features/practice/AttemptResultPage';
import { HistoryPage } from '@/features/practice/HistoryPage';
import { PlansPage } from '@/features/billing/PlansPage';
import { CheckoutPage } from '@/features/billing/CheckoutPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { AdminLayout } from '@/features/admin/AdminLayout';
import { AdminRoute } from '@/features/admin/AdminRoute';
import { QuestionSetListPage } from '@/features/admin/QuestionSetListPage';
import { QuestionSetDetailPage } from '@/features/admin/QuestionSetDetailPage';
import { QuestionSetEditorPage } from '@/features/admin/QuestionSetEditorPage';
import { ImportAdminPage } from '@/features/admin/ImportAdminPage';
import { PlanAdminPage } from '@/features/admin/PlanAdminPage';
import { OrderAdminPage } from '@/features/admin/OrderAdminPage';
import { RefundAdminPage } from '@/features/admin/RefundAdminPage';
import { ReportAdminPage } from '@/features/admin/ReportAdminPage';
import { BankTransferAdminPage } from '@/features/admin/BankTransferAdminPage';
import { UserAdminPage } from '@/features/admin/UserAdminPage';
import { ScoringConfigPage } from '@/features/admin/ScoringConfigPage';
import { SkillTestAdminPage } from '@/features/admin/SkillTestAdminPage';

export function App() {
  const navigate = useNavigate();
  const { restore, initializing, clear } = useAuthStore();

  useEffect(() => {
    void restore();
  }, [restore]);

  // Refresh token hết hiệu lực → về trang đăng nhập, không để app treo ở lỗi 401
  useEffect(() => {
    setAuthFailureHandler(() => {
      clear();
      navigate('/login', { replace: true });
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
        <Route path="imports" element={<ImportAdminPage />} />
        <Route path="plans" element={<PlanAdminPage />} />
        <Route path="orders" element={<OrderAdminPage />} />
        <Route path="bank-transfers" element={<BankTransferAdminPage />} />
        <Route path="refunds" element={<RefundAdminPage />} />
        <Route path="users" element={<UserAdminPage />} />
        <Route path="reports" element={<ReportAdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
