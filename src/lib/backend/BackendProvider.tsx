import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { backend } from './index';
import { queryClient } from './queryClient';

/**
 * Wraps the app in the query client and wires the two out-of-band signals
 * that should refresh data: another tab writing localStorage, and the auth
 * session changing.
 *
 * PLUG(supabase): realtime subscriptions (if ever wanted) go here too.
 */
export function BackendProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('paula')) void queryClient.invalidateQueries();
    };
    window.addEventListener('storage', onStorage);
    const off = backend.auth.onAuthChange(() => { void queryClient.invalidateQueries(); });
    return () => {
      window.removeEventListener('storage', onStorage);
      off();
    };
  }, []);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
