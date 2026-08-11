import { ApiError } from '@/api/client';

/**
 * Chuyển lỗi bất kỳ thành nội dung hiển thị được cho học viên.
 *
 * <p>Backend đã quy ước ở `ErrorCode`: "Frontend map mã này sang thông báo
 * tiếng Việt". Đây là chỗ duy nhất làm việc đó — trang nào cũng gọi vào đây
 * thay vì tự chế câu thông báo, để cùng một mã lỗi không hiện ra hai kiểu chữ
 * khác nhau ở hai màn hình.
 *
 * <p>`canRetry` quan trọng không kém phần chữ: bày nút "Thử lại" cho lỗi phân
 * quyền là mời người dùng bấm vào một nút không bao giờ chạy được.
 */

export type ErrorTone = 'error' | 'warning' | 'info';

export interface ErrorAction {
  label: string;
  to: string;
}

export interface ErrorPresentation {
  title: string;
  description: string;
  tone: ErrorTone;
  /** Bấm lại có cơ hội thành công không. Lỗi phân quyền thì không. */
  canRetry: boolean;
  action?: ErrorAction;
}

const HOME: ErrorAction = { label: 'Về trang chủ', to: '/' };
const HISTORY: ErrorAction = { label: 'Xem bài làm của tôi', to: '/history' };
const PLANS: ErrorAction = { label: 'Xem các gói Premium', to: '/plans' };
const LOGIN: ErrorAction = { label: 'Đăng nhập lại', to: '/login' };

const BY_CODE: Record<string, Omit<ErrorPresentation, 'tone'> & { tone?: ErrorTone }> = {
  // --- Lượt làm bài ---
  ATTEMPT_NOT_OWNED: {
    title: 'Bài làm này không thuộc tài khoản của bạn',
    description:
      'Mỗi lượt làm bài chỉ mở được bằng chính tài khoản đã tạo ra nó. Nếu ai đó gửi link này cho bạn, họ cần chia sẻ ảnh chụp kết quả thay vì link.',
    canRetry: false,
    action: HISTORY,
    tone: 'warning',
  },
  ATTEMPT_NOT_FOUND: {
    title: 'Không tìm thấy lượt làm bài',
    description: 'Lượt này có thể đã bị xóa, hoặc link bị sao chép thiếu ký tự.',
    canRetry: false,
    action: HISTORY,
  },
  ATTEMPT_EXPIRED: {
    title: 'Lượt làm bài đã hết giờ',
    description: 'Hệ thống đã tự nộp bài khi hết thời gian. Bạn xem lại kết quả ở lịch sử.',
    canRetry: false,
    action: HISTORY,
    tone: 'warning',
  },
  ATTEMPT_ALREADY_SUBMITTED: {
    title: 'Bài đã được nộp',
    description: 'Lượt này đã nộp nên không sửa được nữa.',
    canRetry: false,
    action: HISTORY,
    tone: 'info',
  },
  ATTEMPT_NOT_STARTED: {
    title: 'Lượt làm bài chưa bắt đầu',
    description: 'Bấm bắt đầu ở màn hình giới thiệu trước khi làm bài.',
    canRetry: false,
    action: HISTORY,
    tone: 'info',
  },
  RESULT_NOT_READY: {
    title: 'Kết quả chưa chấm xong',
    description: 'Bài Nói và Viết cần thêm chút thời gian để chấm. Bạn quay lại sau ít phút.',
    canRetry: true,
    tone: 'info',
  },

  // --- Quyền truy cập nội dung ---
  PREMIUM_REQUIRED: {
    title: 'Nội dung thuộc gói Premium',
    description: 'Nâng cấp Premium để mở toàn bộ đề và bài test của kỹ năng này.',
    canRetry: false,
    action: PLANS,
    tone: 'warning',
  },
  CONTENT_NOT_PUBLISHED: {
    title: 'Nội dung tạm thời không khả dụng',
    description: 'Đề này đang được biên tập lại. Bạn chọn đề khác giúp nhé.',
    canRetry: false,
    action: HOME,
    tone: 'warning',
  },
  NOT_ENOUGH_QUESTION_SETS: {
    title: 'Chưa đủ câu hỏi để tạo đề',
    description: 'Ngân hàng câu hỏi của phần này chưa đủ. Bạn thử Part khác hoặc bỏ bớt bộ lọc.',
    canRetry: false,
    action: HOME,
    tone: 'warning',
  },
  FORBIDDEN: {
    title: 'Bạn không có quyền truy cập',
    description: 'Tài khoản hiện tại không được phép xem nội dung này.',
    canRetry: false,
    action: HOME,
    tone: 'warning',
  },

  // --- Phiên đăng nhập ---
  UNAUTHENTICATED: {
    title: 'Phiên đăng nhập đã hết hạn',
    description: 'Bạn cần đăng nhập lại để tiếp tục.',
    canRetry: false,
    action: LOGIN,
    tone: 'warning',
  },
  TOKEN_INVALID: {
    title: 'Phiên đăng nhập không hợp lệ',
    description: 'Bạn cần đăng nhập lại để tiếp tục.',
    canRetry: false,
    action: LOGIN,
    tone: 'warning',
  },
  TOKEN_EXPIRED: {
    title: 'Phiên đăng nhập đã hết hạn',
    description: 'Bạn cần đăng nhập lại để tiếp tục.',
    canRetry: false,
    action: LOGIN,
    tone: 'warning',
  },
  EMAIL_NOT_VERIFIED: {
    title: 'Tài khoản chưa xác minh email',
    description: 'Mở email đăng ký và bấm liên kết xác minh, sau đó tải lại trang.',
    canRetry: true,
    tone: 'warning',
  },
  ACCOUNT_LOCKED: {
    title: 'Tài khoản đang bị tạm khóa',
    description: 'Đăng nhập sai quá nhiều lần. Bạn chờ ít phút rồi thử lại.',
    canRetry: false,
    action: LOGIN,
    tone: 'warning',
  },
  ACCOUNT_SUSPENDED: {
    title: 'Tài khoản đã bị đình chỉ',
    description: 'Liên hệ bộ phận hỗ trợ để được mở lại.',
    canRetry: false,
    tone: 'warning',
  },

  // --- Không tìm thấy / dữ liệu ---
  RESOURCE_NOT_FOUND: {
    title: 'Không tìm thấy nội dung',
    description: 'Nội dung có thể đã bị xóa hoặc đường dẫn không còn đúng.',
    canRetry: false,
    action: HOME,
  },

  // --- Lỗi hệ thống, thử lại có ích ---
  NETWORK_ERROR: {
    title: 'Không kết nối được máy chủ',
    description: 'Kiểm tra kết nối mạng rồi thử lại.',
    canRetry: true,
  },
  RATE_LIMITED: {
    title: 'Bạn thao tác hơi nhanh',
    description: 'Chờ một lát rồi thử lại giúp nhé.',
    canRetry: true,
    tone: 'info',
  },
  INTERNAL_ERROR: {
    title: 'Hệ thống gặp sự cố',
    description: 'Lỗi từ phía máy chủ, không phải do bạn. Thử lại sau ít phút.',
    canRetry: true,
  },
  QUESTION_SET_CONTENT_MISSING: {
    title: 'Đề bị thiếu nội dung',
    description: 'Lỗi dữ liệu phía hệ thống. Chúng tôi đã ghi nhận, bạn chọn đề khác giúp nhé.',
    canRetry: false,
    action: HOME,
  },
  STORAGE_ERROR: {
    title: 'Không tải được tệp',
    description: 'Kho lưu trữ đang trục trặc. Thử lại sau ít phút.',
    canRetry: true,
  },
  AUDIO_PLAY_LIMIT_REACHED: {
    title: 'Đã hết lượt nghe',
    description: 'Phần này giới hạn số lần phát audio giống thi thật.',
    canRetry: false,
    tone: 'info',
  },
};

const UNKNOWN: ErrorPresentation = {
  title: 'Đã có lỗi xảy ra',
  description: 'Bạn thử lại, hoặc quay về trang chủ nếu lỗi vẫn tiếp diễn.',
  tone: 'error',
  canRetry: true,
  action: HOME,
};

/**
 * @param fallbackTitle tiêu đề dùng khi không nhận ra mã lỗi — để mỗi trang
 *     vẫn nói được đúng ngữ cảnh của mình ("Không tải được danh sách gói").
 */
export function describeError(error: unknown, fallbackTitle?: string): ErrorPresentation {
  if (error instanceof ApiError) {
    const known = BY_CODE[error.code];
    if (known) {
      return { tone: 'error', ...known };
    }

    // Mã lạ (backend thêm mã mới mà frontend chưa cập nhật): đoán theo HTTP
    // status. 4xx là lỗi nghiệp vụ, bấm lại vô ích; 5xx thì thử lại có lý.
    const serverFault = error.status >= 500 || error.status === 0;
    return {
      ...UNKNOWN,
      title: fallbackTitle ?? UNKNOWN.title,
      description: error.message || UNKNOWN.description,
      canRetry: serverFault,
    };
  }

  return { ...UNKNOWN, title: fallbackTitle ?? UNKNOWN.title };
}
