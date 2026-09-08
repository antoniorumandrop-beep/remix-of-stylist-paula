import { MutationCache, QueryClient } from '@tanstack/react-query';
import { backend } from './index';

/**
 * One query client for the whole app.
 *
 * After any mutation succeeds, every query is invalidated. That is the whole
 * reactivity model: a screen changes data through a mutation, every other
 * screen re-reads. Blunt, but the data is tiny and it works identically for
 * localStorage and for a database — and it cannot suffer the bug we hit with
 * writes hidden inside React state updaters (see `fitFeedback.ts`).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: backend.name === 'local' ? 0 : 1,
      refetchOnWindowFocus: backend.name !== 'local',
    },
  },
  mutationCache: new MutationCache({
    onSuccess: () => { void queryClient.invalidateQueries(); },
  }),
});
