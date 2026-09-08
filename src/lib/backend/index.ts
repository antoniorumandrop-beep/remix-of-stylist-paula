import type { Backend, BackendName } from './types';
import { createLocalBackend } from './local';
import { createSupabaseBackend } from './supabase';

/**
 * The one place that decides which backend the app talks to.
 *
 * PLUG(supabase): set `VITE_BACKEND=supabase` (plus the Supabase URL and anon
 * key that Lovable Cloud generates) and every screen switches over. Nothing
 * else in `src/` needs to know.
 */
const requested = (import.meta.env.VITE_BACKEND as BackendName | undefined) ?? 'local';

function pick(): Backend {
  if (requested === 'supabase') {
    const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
    if (configured) return createSupabaseBackend();
    console.warn('[paula] VITE_BACKEND=supabase but no Supabase credentials in env — using the local backend.');
  }
  return createLocalBackend();
}

export const backend: Backend = pick();

export * from './types';
export { qk } from './keys';
