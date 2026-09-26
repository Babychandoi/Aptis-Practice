import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '@/app/App';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { ApiError } from '@/api/client';
import './index.css';

/*
  Tab mở từ trước lần deploy vẫn giữ tên file JS cũ; bản mới đã thay tên (hash)
  nên mở trang chưa từng vào sẽ lỗi tải file và trắng trang. Gặp lỗi này thì tải
  lại để lấy bản mới. Giới hạn một lần mỗi 30 giây để không lặp vô tận nếu lỗi
  là do mạng chứ không phải do deploy.
*/
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'aptis-reloaded-for-new-version';
  let last = 0;
  try { last = Number(sessionStorage.getItem(KEY) ?? 0); } catch { /* bị chặn storage thì vẫn thử tải lại */ }
  if (Date.now() - last < 30_000) return;
  event.preventDefault();
  try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* bỏ qua */ }
  window.location.reload();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        // Không retry lỗi nghiệp vụ (403 Premium, 404, 409) — chỉ lỗi tạm thời
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Bên trong router: trang lỗi cần <Link> để đưa người dùng đi tiếp */}
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
