import { useAuthStore } from '@/features/auth/authStore';

/**
 * Quyền đọc từ danh sách backend trả về, không suy ra từ tên role ở client —
 * client và server phải dùng chung một nguồn, nếu không giao diện sẽ hiện thứ
 * mà API sẽ từ chối.
 *
 * Đây chỉ là lớp ẩn/hiện cho đỡ khó dùng; chặn thật nằm ở `@PreAuthorize` phía
 * backend.
 */
export function usePermission(): {
  has: (permission: string) => boolean;
  hasAny: (...permissions: string[]) => boolean;
  isAdmin: boolean;
} {
  const permissions = useAuthStore((state) => state.user?.permissions);

  const has = (permission: string) => (permissions ?? []).includes(permission);
  const hasAny = (...list: string[]) => list.some(has);

  return {
    has,
    hasAny,
    // Vào được khu quản trị khi có bất kỳ quyền quản trị nào
    isAdmin: hasAny(
      'question_set:read',
      'question_set:write',
      'plan:write',
      'order:read',
      'refund:write',
      'entitlement:grant',
      'report:read',
    ),
  };
}
