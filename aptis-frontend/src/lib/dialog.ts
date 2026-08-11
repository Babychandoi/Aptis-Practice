import Swal, { type SweetAlertOptions } from 'sweetalert2';

/**
 * Hộp thoại dùng chung, thay cho window.confirm/alert của trình duyệt.
 *
 * Gom vào một chỗ để mọi dialog cùng màu brand, cùng bố cục nút và cùng cách
 * gọi — nếu gọi Swal.fire trực tiếp ở từng trang thì mỗi nơi sẽ tự đặt màu và
 * nhãn nút khác nhau.
 *
 * Nút "xác nhận" luôn nằm bên phải và "huỷ" bên trái, giống các nút
 * btn-secondary / btn-primary trong app.
 */

/** Màu lấy từ tailwind.config brand-800 / brand-900 để dialog không lệch theme. */
const BRAND_800 = '#0d493d';
const DANGER = '#b3261e';

const base: SweetAlertOptions = {
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  customClass: {
    popup: 'rounded-2xl',
    title: 'text-lg font-semibold text-stone-900',
    htmlContainer: 'text-sm leading-6 text-stone-600',
    actions: 'gap-2',
    confirmButton: 'btn-primary',
    cancelButton: 'btn-secondary',
    denyButton: 'btn-secondary',
  },
};

/**
 * Hỏi xác nhận trước một hành động. Trả về true nếu người dùng đồng ý.
 *
 * @param danger hành động khó hoàn tác (xoá, huỷ quyền) — nút xác nhận đổi sang
 *               màu đỏ để phân biệt với xác nhận thông thường.
 */
export async function confirmDialog(options: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    icon: options.danger ? 'warning' : 'question',
    iconColor: options.danger ? DANGER : BRAND_800,
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Xác nhận',
    cancelButtonText: options.cancelText ?? 'Huỷ',
    customClass: {
      ...base.customClass,
      confirmButton: options.danger ? 'btn btn-danger' : 'btn-primary',
    },
  });
  return result.isConfirmed;
}

/** Thông báo thành công, tự đóng sau 2 giây ở góc trên phải. */
export function toastSuccess(title: string) {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    iconColor: BRAND_800,
    title,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    customClass: { popup: 'rounded-xl', title: 'text-sm font-medium' },
  });
}

/** Thông báo lỗi, buộc người dùng đóng để chắc chắn họ đã đọc. */
export function alertError(title: string, text?: string) {
  return Swal.fire({
    ...base,
    icon: 'error',
    iconColor: DANGER,
    title,
    text,
    confirmButtonText: 'Đã hiểu',
  });
}

/** Thông báo thường, không phải lỗi. */
export function alertInfo(title: string, text?: string) {
  return Swal.fire({
    ...base,
    icon: 'info',
    iconColor: BRAND_800,
    title,
    text,
    confirmButtonText: 'Đã hiểu',
  });
}
