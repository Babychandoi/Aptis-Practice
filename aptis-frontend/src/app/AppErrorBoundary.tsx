import React from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Lưới an toàn cuối cùng của giao diện.
 *
 * <p>Trước đây một lỗi render bất kỳ (đọc thuộc tính của `undefined` trong một
 * renderer câu hỏi chẳng hạn) sẽ làm React gỡ toàn bộ cây component và để lại
 * màn hình trắng — người dùng không biết chuyện gì xảy ra và mất luôn lối
 * quay lại.
 *
 * <p>Phải là class component: React chưa có hook tương đương cho
 * `componentDidCatch`.
 *
 * <p>Đặt BÊN TRONG router để nút quay về trang chủ dùng được `Link`.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Chưa có dịch vụ thu thập lỗi; ít nhất giữ lại stack trong console để
    // còn dựng lại được sự cố từ báo cáo của người dùng.
    console.error('Lỗi render không bắt được:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <ErrorState
        fullPage
        onRetry={this.reset}
        presentation={{
          title: 'Giao diện gặp sự cố',
          description:
            'Trang này không hiển thị được do lỗi phía ứng dụng. Bạn thử tải lại, hoặc quay về trang chủ.',
          tone: 'error',
          canRetry: true,
          action: { label: 'Về trang chủ', to: '/' },
        }}
      />
    );
  }
}
