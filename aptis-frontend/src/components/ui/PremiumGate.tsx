import { Link } from 'react-router-dom';

/**
 * Hiển thị khi backend trả PREMIUM_REQUIRED. Frontend không tự quyết định
 * quyền — chỉ phản ứng theo phản hồi của backend (§42).
 */
export function PremiumGate({
  message = 'Nội dung này thuộc gói Premium.',
}: {
  message?: string;
}) {
  return (
    <div className="card border-amber-200 bg-amber-50">
      <h3 className="font-semibold text-amber-900">Cần gói Premium</h3>
      <p className="mt-1 text-sm text-amber-800">{message}</p>
      <Link to="/plans" className="btn-primary mt-3">
        Xem các gói Premium
      </Link>
    </div>
  );
}
