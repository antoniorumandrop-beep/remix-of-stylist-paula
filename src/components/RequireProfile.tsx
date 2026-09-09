import { Navigate } from 'react-router-dom';
import { useBodyProfile } from '@/lib/profile';

/**
 * Gate for the parts of the app that need a body.
 *
 * Fit Score is computed from proportions, so without a profile every badge
 * resolves to null and the app reads as broken rather than as unfinished — a
 * signed-in woman with no measurements landed on a feed where nothing could
 * be scored and nothing explained why.
 *
 * Deliberately separate from `RequireAuth` rather than folded into it:
 * `/onboarding` is itself behind the auth gate, so a profile check inside
 * `RequireAuth` would redirect onboarding to onboarding forever. This one is
 * applied to `/app` only. `/admin/import` is left out too — brand-side
 * tooling has no reason to know anyone's measurements.
 */
export function RequireProfile({ children }: { children: JSX.Element }) {
  const { profile, loading } = useBodyProfile();
  // One blank tick rather than a flash of the onboarding screen for someone
  // who does have a profile.
  if (loading) return null;
  if (!profile) return <Navigate to="/onboarding" replace />;
  return children;
}
