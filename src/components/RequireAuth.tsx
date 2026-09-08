import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@/lib/auth';

/**
 * Gate for everything behind the login. While the session is being read the
 * page stays blank for one tick rather than flashing the login screen.
 */
export function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useSession();
  const location = useLocation();
  if (loading) return null;
  if (!session) return <Navigate to="/login?mode=login" replace state={{ from: location.pathname }} />;
  return children;
}
