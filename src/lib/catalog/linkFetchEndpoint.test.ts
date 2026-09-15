import { describe, it, expect, vi, afterEach } from 'vitest';
import { productFetchEndpoint } from '@/lib/catalog/linkFetch';

/**
 * Dokąd idzie żądanie o stronę sklepu.
 *
 * Trzy przypadki, bo każdy ma inną uczciwą odpowiedź:
 *
 * - **dev** — middleware `vite-plugins/fetch-product.ts`, jak dotąd;
 * - **produkcja z Supabase** — edge function `/functions/v1/fetch-product`;
 * - **produkcja bez Supabase** — `null`, czyli „nie ma dokąd". To nie jest
 *   przypadek teoretyczny: build bez `VITE_SUPABASE_URL` uderzyłby w
 *   SPA-fallback, dostał `index.html` ze statusem 200 i obwinił sklep o
 *   żądanie, które do sklepu nie wyszło. Ta sama pułapka, co przy skanie
 *   (`src/lib/fitCutout.test.ts`).
 */
describe('adres pobrania strony sklepu', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('w dev idzie do middleware dev-serwera', () => {
    vi.stubEnv('DEV', true);
    expect(productFetchEndpoint()).toBe('/__paula/fetch-product');
  });

  it('w produkcji idzie do edge function', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://przyklad.supabase.co');
    expect(productFetchEndpoint()).toBe('https://przyklad.supabase.co/functions/v1/fetch-product');
  });

  it('obcina ukośnik na końcu, żeby nie zrobić podwójnego', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://przyklad.supabase.co/');
    expect(productFetchEndpoint()).toBe('https://przyklad.supabase.co/functions/v1/fetch-product');
  });

  it('bez Supabase mówi, że nie ma dokąd, zamiast trafić w SPA-fallback', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', '');
    expect(productFetchEndpoint()).toBeNull();
  });
});
