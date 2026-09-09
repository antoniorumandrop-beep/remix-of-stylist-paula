import { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/lib/auth';

/**
 * Gate for everything behind the login. While the session is being read the
 * page stays blank for one tick rather than flashing the login screen.
 *
 * The `Suspense` matters and is not decoration. This gate renders `null`, then
 * swaps to its children the moment the session resolves — a synchronous state
 * update. When those children are a lazily loaded route, they suspend inside
 * that update and React throws "a component suspended while responding to
 * synchronous input", which the error boundary catches and turns into the
 * crash screen. Every gated route needs a boundary directly beneath the swap:
 * `/onboarding` and `/admin/import` hang off this one, and `/app` has its own
 * around the outlet in `AppShell`.
 */
export function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useSession();
  const location = useLocation();
  if (loading) return null;
  if (!session) return <Navigate to="/login?mode=login" replace state={{ from: location.pathname }} />;
  return <Suspense fallback={null}>{children}</Suspense>;
}
