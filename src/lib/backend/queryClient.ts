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
/**
 * Built by a factory rather than inline so tests can create their own client
 * with the same behaviour. They used to build a bare `new QueryClient()`,
 * which has no mutation cache — so nothing invalidated after a write and the
 * tests quietly exercised a reactivity model the app does not have.
 */
export function createQueryClient(): QueryClient {
  // The cache refers to the client it belongs to. That is safe: `onSuccess`
  // only ever runs after a mutation, which is long after the binding exists.
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: backend.name === 'local' ? 0 : 1,
        refetchOnWindowFocus: backend.name !== 'local',
      },
    },
    mutationCache: new MutationCache({
      onSuccess: () => { void client.invalidateQueries(); },
    }),
  });
  return client;
}

export const queryClient = createQueryClient();
