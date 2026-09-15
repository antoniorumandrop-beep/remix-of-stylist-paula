import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchProductDraft } from '@/lib/catalog/linkFetch';

/**
 * Gdy funkcji pod adresem nie ma.
 *
 * Adres wylicza się z projektu Supabase, a istnienie projektu **nie** znaczy,
 * że funkcja jest w nim postawiona — sprawdzone 2026-09-15, brama oddaje wtedy
 * `404 {"code":"NOT_FOUND"}`. Zgadywanie tego przy budowaniu jest niemożliwe,
 * więc rozstrzyga się to w locie: brak funkcji ma dostać własne zdanie, a nie
 * wylądować w „coś poszło nie tak" albo — gorzej — w komunikacie obwiniającym
 * sklep o żądanie, którego nikt do niego nie wysłał.
 */
describe('brak wdrożonej funkcji', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('mówi, że czytanie linku nie jest podłączone', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://przyklad.supabase.co');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Requested function was not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    const wynik = await fetchProductDraft('https://sklep.example.pl/produkt/1');

    expect(wynik.status).toBe('error');
    expect(wynik.status === 'error' && wynik.code).toBe('not-wired');
  });

  it('404 od samego sklepu to nadal błąd sklepu, nie brak funkcji', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://przyklad.supabase.co');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'shop returned HTTP 404', shopStatus: 404 }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    const wynik = await fetchProductDraft('https://sklep.example.pl/produkt/1');

    expect(wynik.status).toBe('error');
    expect(wynik.status === 'error' && wynik.code).toBe('http-error');
  });
});
