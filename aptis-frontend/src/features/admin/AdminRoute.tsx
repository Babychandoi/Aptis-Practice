import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from './usePermission';

/**
 * Chặn vào khu quản trị khi tài khoản không có quyền nào.
 *
 * <p>Chỉ là lớp cho đỡ khó dùng — mọi endpoint admin đều có `@PreAuthorize`
 * phía backend, nên chỉnh sửa phía client không mở được dữ liệu.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = usePermission();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
