import { parseProductPage, type LinkDraft } from './link';
import { classifyFetchError, type FetchErrorCode } from './fetchErrors';

/**
 * Fetching the shop page.
 *
 * Kept apart from `link.ts` so the parser stays pure and fully testable — the
 * network is the only part of this feature that cannot be covered by a test
 * with a fixture.
 *
 * Gniazdo PLUG(supabase) jest zapięte: w dev pobiera middleware dev-serwera, w
 * produkcji edge function `supabase/functions/fetch-product`. Obie robią te
 * same trzy rzeczy — sprawdzenie robots.txt, własny User-Agent, jedna strona na
 * żądanie — i oddają `{ html, finalUrl, truncated }`. Parser i wszystko nad nim
 * zostaje bez zmiany; o to właśnie chodziło w tym podziale. Szczegóły w
 * `docs/integration-points.md`.
 */

const DEV_ENDPOINT = '/__paula/fetch-product';

/**
 * Dokąd wysłać żądanie o stronę sklepu — albo `null`, gdy nie ma dokąd.
 *
 * W produkcji adres bierze się z `VITE_FETCH_PRODUCT_ENDPOINT` i **nie jest
 * wyliczany z `VITE_SUPABASE_URL`**. To wygląda na okrężną drogę i jest
 * celowe: istnienie projektu Supabase nie znaczy, że funkcja jest w nim
 * postawiona. Sprawdzone 2026-09-15 — na projekcie `jandgkqczktqlzhqkjqp` nie
 * jest wdrożona ŻADNA edge function, `mcp` włącznie, a brama odpowiada
 * `404 NOT_FOUND`. Gdyby adres brał się z samego istnienia projektu, ekran
 * pokazałby działający formularz nad funkcją, której nie ma — czyli dokładnie
 * to udawanie, którego ten projekt unika.
 *
 * Zmienna jest więc świadomym oświadczeniem „funkcja stoi pod tym adresem",
 * ustawianym dopiero po wdrożeniu. Póki jest pusta, ekran mówi wprost, że
 * czytanie linku nie jest podłączone.
 *
 * Powód i dowód: `src/lib/catalog/linkFetchEndpoint.test.ts`.
 */
export function productFetchEndpoint(): string | null {
  if (import.meta.env.DEV) return DEV_ENDPOINT;
  const configured = String(import.meta.env.VITE_FETCH_PRODUCT_ENDPOINT ?? '').trim();
  return configured ? configured.replace(/\/+$/, '') : null;
}

/** String discriminant for the same reason as `DraftConversion` in `link.ts`. */
export type FetchDraftResult =
  | { status: 'ok'; draft: LinkDraft }
  /** `error` stays for the log; `code` is what the interface renders. */
  | { status: 'error'; error: string; code: FetchErrorCode };

export async function fetchProductDraft(rawUrl: string): Promise<FetchDraftResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { status: 'error', error: 'empty', code: 'no-content' };

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return { status: 'error', error: 'notAUrl', code: 'not-a-url' };
  }

  const endpoint = productFetchEndpoint();
  if (!endpoint) return { status: 'error', error: 'not wired up', code: 'not-wired' };

  // Brama Supabase wymaga klucza publikowalnego także przy `verify_jwt = false`.
  // W dev nagłówek jest zbędny, ale nieszkodliwy — middleware go nie czyta.
  const key = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '');
  const headers = key ? { apikey: key, authorization: `Bearer ${key}` } : undefined;

  try {
    const res = await fetch(`${endpoint}?url=${encodeURIComponent(url.toString())}`, { headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const { error, shopStatus } = body as { error?: string; shopStatus?: number };
      const message = error ?? `HTTP ${res.status}`;
      return { status: 'error', error: message, code: classifyFetchError({ status: shopStatus, message }) };
    }
    const { html, finalUrl, truncated } = body as { html?: string; finalUrl?: string; truncated?: boolean };
    if (!html) return { status: 'error', error: 'empty response', code: 'no-content' };
    const draft = parseProductPage(html, finalUrl ?? url.toString());
    if (truncated) {
      // Shops put structured data at the very end of the document, so a cut-off
      // page loses the best source first. Never let that pass as a clean read.
      draft.warnings.unshift('the page was too large to read in full, so some fields may be missing');
    }
    return { status: 'ok', draft };
  } catch (e) {
    const message = (e as Error).message;
    return { status: 'error', error: message, code: classifyFetchError({ message }) };
  }
}
