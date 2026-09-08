import { useMutation, useQuery } from '@tanstack/react-query';
import { backend, qk, type UserPrefs } from '@/lib/backend';
import { DEFAULT_PREFS } from '@/lib/backend/local';

/** Name, taste, budget — the onboarding answers that are not the body. */
export function useUserPrefs() {
  const query = useQuery({ queryKey: qk.prefs, queryFn: () => backend.prefs.get() });
  const update = useMutation({ mutationFn: (patch: Partial<UserPrefs>) => backend.prefs.update(patch) });
  return {
    prefs: query.data ?? DEFAULT_PREFS,
    loading: query.isPending,
    update: (patch: Partial<UserPrefs>) => update.mutateAsync(patch),
  };
}

export type { UserPrefs };
