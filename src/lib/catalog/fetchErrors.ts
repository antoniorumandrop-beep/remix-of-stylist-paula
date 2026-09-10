import type { TranslationKey } from '@/i18n/translations';

/**
 * Why a shop page could not be read.
 *
 * Measured on 2026-09-10 against the two biggest high-street chains in Poland:
 *
 * - **Zara** answers `403` at the Akamai edge to anything that is not a
 *   browser — `robots.txt` itself included, so we cannot even ask permission.
 * - **H&M** completes the TLS handshake, takes the request, and then resets
 *   the HTTP/2 stream. In Node that surfaces as a timeout, which reads like
 *   our own bug rather than their refusal.
 *
 * Both were showing the user "The operation was aborted due to timeout" and
 * "shop returned HTTP 403" — English, technical, and blaming the wrong party.
 * The fetcher now emits a stable code and the interface translates it, the
 * same rule the fit engine already follows: the engine names the case, the UI
 * finds the words.
 *
 * We are not going to answer a bot wall by pretending to be Chrome. The
 * middleware sends its own User-Agent on purpose, and a shop that says no is
 * entitled to be believed. What we owe the user is a sentence that says which
 * of the two happened and what she can do instead.
 */
export type FetchErrorCode =
  | 'blocked'
  | 'robots-disallow'
  | 'timeout'
  | 'http-error'
  | 'not-a-url'
  | 'private-address'
  | 'no-content'
  | 'unknown';

const KEYS: Record<FetchErrorCode, TranslationKey> = {
  'blocked': 'importErrorBlocked',
  'robots-disallow': 'importErrorRobots',
  'timeout': 'importErrorTimeout',
  'http-error': 'importErrorHttp',
  'not-a-url': 'importErrorNotAUrl',
  'private-address': 'importErrorPrivate',
  'no-content': 'importErrorEmpty',
  'unknown': 'importErrorUnknown',
};

export const fetchErrorKey = (code: string): TranslationKey =>
  KEYS[code as FetchErrorCode] ?? KEYS.unknown;

/**
 * Classifies what the middleware (or `fetch` itself) reported.
 *
 * The status is the strong signal; the message is the fallback, because a
 * stream the shop resets never produces a status at all.
 */
export function classifyFetchError(input: { status?: number; message?: string }): FetchErrorCode {
  const { status } = input;
  const message = (input.message ?? '').toLowerCase();

  if (message.includes('robots')) return 'robots-disallow';
  if (status === 401 || status === 403 || status === 429) return 'blocked';
  // A CDN that drops the connection mid-request rather than answering. Node
  // words this several ways depending on where the socket died.
  if (
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('socket hang up') ||
    message.includes('econnreset') ||
    message.includes('stream') ||
    message.includes('fetch failed')
  ) {
    return 'timeout';
  }
  if (message.includes('private address')) return 'private-address';
  if (message.includes('only http') || message.includes('does not resolve') || message.includes('invalid url')) {
    return 'not-a-url';
  }
  if (typeof status === 'number' && status >= 400) return 'http-error';
  if (message.includes('empty')) return 'no-content';
  return 'unknown';
}
