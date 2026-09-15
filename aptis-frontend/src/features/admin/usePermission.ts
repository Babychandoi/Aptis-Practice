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

  // Giáo viên khách hàng có question_set:read (để xem đề mà giao bài) và
  // classroom:read (để xem lớp của mình) — hai quyền cũng nằm trong danh sách
  // quản trị bên dưới. Không loại trừ thì họ thấy cả khu quản trị, trong khi
  // đó là khu của nhân viên công ty.
  //
  // Dấu hiệu phân biệt: giáo viên có classroom:write nhưng không bao giờ có
  // classroom:admin; nhân viên nội dung thì ngược lại, không có classroom:write.
  const laGiaoVienNgoai = has('classroom:write') && !has('classroom:admin');

  return {
    has,
    hasAny,
    // Vào được khu quản trị khi có bất kỳ quyền quản trị nào
    isAdmin:
      !laGiaoVienNgoai &&
      hasAny(
        'question_set:read',
        'question_set:write',
        'plan:write',
        'order:read',
        'refund:write',
        'entitlement:grant',
        'report:read',
        'affiliate:read',
        'analytics:read',
        'classroom:read',
      ),
  };
}
