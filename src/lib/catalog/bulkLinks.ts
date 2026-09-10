import { fetchProductDraft } from './linkFetch';
import type { LinkDraft } from './link';

export const BULK_LIMIT = 20;

export interface BulkRow {
  url: string;
  status: 'ok' | 'error';
  draft?: LinkDraft;
  error?: string;
}

/**
 * Splits a pasted block into URLs: one per line, blanks and duplicates gone.
 *
 * Kept pure and separate from the fetching so it can be tested without a
 * network — the same split that keeps `link.ts` (the parser) testable.
 */
export function parseUrlList(text: string, limit = BULK_LIMIT): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/[\r\n]+/)) {
    const url = line.trim();
    if (!url || url.startsWith('#')) continue;
    const key = url.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Reads a list of shop pages, one at a time.
 *
 * Sequential on purpose, with a pause between requests. Every one of these is
 * a page on somebody else's server, asked for because a person pasted the
 * address — twenty of them in parallel is the shape of a crawler, which is
 * exactly what this project promised not to be.
 */
export async function fetchDrafts(
  urls: string[],
  onProgress?: (done: number, total: number) => void,
  gapMs = 300,
): Promise<BulkRow[]> {
  const rows: BulkRow[] = [];
  for (const url of urls) {
    const result = await fetchProductDraft(url);
    rows.push(
      result.status === 'ok'
        ? { url, status: 'ok', draft: result.draft }
        : { url, status: 'error', error: result.error },
    );
    onProgress?.(rows.length, urls.length);
    if (gapMs > 0 && rows.length < urls.length) {
      await new Promise(resolve => setTimeout(resolve, gapMs));
    }
  }
  return rows;
}
