import { parseProductPage, type LinkDraft } from './link';

/**
 * Fetching the shop page.
 *
 * Kept apart from `link.ts` so the parser stays pure and fully testable — the
 * network is the only part of this feature that cannot be covered by a test
 * with a fixture.
 *
 * PLUG(supabase): replace the dev endpoint with an edge function that does the
 * same three things (robots.txt check, our own User-Agent, one page per user
 * request) and returns `{ html, finalUrl }`. The parser and everything above
 * it stay exactly as they are — that is the point of the split. Details in
 * `docs/integration-points.md`.
 */

const DEV_ENDPOINT = '/__paula/fetch-product';

/** String discriminant for the same reason as `DraftConversion` in `link.ts`. */
export type FetchDraftResult =
  | { status: 'ok'; draft: LinkDraft }
  | { status: 'error'; error: string };

export async function fetchProductDraft(rawUrl: string): Promise<FetchDraftResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { status: 'error', error: 'empty' };

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return { status: 'error', error: 'notAUrl' };
  }

  try {
    const res = await fetch(`${DEV_ENDPOINT}?url=${encodeURIComponent(url.toString())}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'error', error: (body as { error?: string }).error ?? `HTTP ${res.status}` };
    const { html, finalUrl, truncated } = body as { html?: string; finalUrl?: string; truncated?: boolean };
    if (!html) return { status: 'error', error: 'empty response' };
    const draft = parseProductPage(html, finalUrl ?? url.toString());
    if (truncated) {
      // Shops put structured data at the very end of the document, so a cut-off
      // page loses the best source first. Never let that pass as a clean read.
      draft.warnings.unshift('the page was too large to read in full, so some fields may be missing');
    }
    return { status: 'ok', draft };
  } catch (e) {
    return { status: 'error', error: (e as Error).message };
  }
}
