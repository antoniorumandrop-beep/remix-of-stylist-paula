import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backend, qk, type Session } from '@/lib/backend';

/**
 * Who is signed in.
 *
 * `loading` covers both the first read and a re-read after invalidation, so
 * a guard never acts on a stale `null` while the fresh answer is in flight.
 */
export function useSession() {
  const query = useQuery({ queryKey: qk.session, queryFn: () => backend.auth.getSession() });
  const session = query.data ?? null;
  return { session, loading: query.isPending || (!session && query.isFetching) };
}

export function useAuth() {
  const client = useQueryClient();
  // Sign-in writes the session straight into the cache: the guard that mounts
  // on the next screen must see it immediately, not after a background refetch.
  const remember = (session: Session | null) => { if (session) client.setQueryData(qk.session, session); };
  const email = useMutation({ mutationFn: (address: string) => backend.auth.signInWithEmail(address), onSuccess: remember });
  const google = useMutation({ mutationFn: () => backend.auth.signInWithGoogle(), onSuccess: remember });
  const out = useMutation({ mutationFn: () => backend.auth.signOut(), onSuccess: () => client.setQueryData(qk.session, null) });
  return {
    signInWithEmail: (address: string) => email.mutateAsync(address),
    signInWithGoogle: () => google.mutateAsync(),
    signOut: () => out.mutateAsync(),
    busy: email.isPending || google.isPending || out.isPending,
  };
}
