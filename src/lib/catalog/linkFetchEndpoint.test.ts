import { describe, it, expect, vi, afterEach } from 'vitest';
import { productFetchEndpoint } from '@/lib/catalog/linkFetch';

/**
 * Dokąd idzie żądanie o stronę sklepu.
 *
 * Trzy przypadki, bo każdy ma inną uczciwą odpowiedź:
 *
 * - **dev** — middleware `vite-plugins/fetch-product.ts`, jak dotąd;
 * - **produkcja z ustawionym adresem** — tam, gdzie wdrożono edge function;
 * - **produkcja bez adresu** — `null`, czyli „nie ma dokąd".
 *
 * Kluczowe jest to, czego tu NIE ma: adres **nie wylicza się z
 * `VITE_SUPABASE_URL`**. Istnienie projektu Supabase nie znaczy, że funkcja
 * jest w nim postawiona — sprawdzone 2026-09-15, na projekcie aplikacji nie
 * jest wdrożona żadna edge function i brama odpowiada `404 NOT_FOUND`.
 * Wyliczanie adresu z samego istnienia projektu pokazałoby działający
 * formularz nad funkcją, której nie ma.
 */
describe('adres pobrania strony sklepu', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('w dev idzie do middleware dev-serwera', () => {
    vi.stubEnv('DEV', true);
    expect(productFetchEndpoint()).toBe('/__paula/fetch-product');
  });

  it('w produkcji idzie pod ustawiony adres', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_FETCH_PRODUCT_ENDPOINT', 'https://przyklad.supabase.co/functions/v1/fetch-product');
    expect(productFetchEndpoint()).toBe('https://przyklad.supabase.co/functions/v1/fetch-product');
  });

  it('obcina ukośnik na końcu, żeby nie zrobić podwójnego', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_FETCH_PRODUCT_ENDPOINT', 'https://przyklad.supabase.co/functions/v1/fetch-product/');
    expect(productFetchEndpoint()).toBe('https://przyklad.supabase.co/functions/v1/fetch-product');
  });

  it('bez ustawionego adresu mówi, że nie ma dokąd', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_FETCH_PRODUCT_ENDPOINT', '');
    expect(productFetchEndpoint()).toBeNull();
  });

  it('samo istnienie projektu Supabase NIE otwiera formularza', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://przyklad.supabase.co');
    vi.stubEnv('VITE_FETCH_PRODUCT_ENDPOINT', '');
    // Funkcja może być niewdrożona, a wtedy brama oddaje 404.
    expect(productFetchEndpoint()).toBeNull();
  });
});
