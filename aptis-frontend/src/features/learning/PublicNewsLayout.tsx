import { Link, Outlet } from 'react-router-dom';
import { AppLayout } from '@/app/AppLayout';
import { useAuthStore } from '@/features/auth/authStore';

/** Only the reading area is public. Authenticated readers keep the normal shell. */
export function PublicNewsLayout() {
  const user = useAuthStore((state) => state.user);
  if (user) return <AppLayout />;
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <Link to="/bang-tin" className="flex items-center gap-3 font-bold text-ink">
            <img src="/images/logo-mark-sm.png" alt="" width={32} height={32} />Aptis Practice
          </Link>
          <Link to="/login" className="btn-primary">Đăng nhập</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
