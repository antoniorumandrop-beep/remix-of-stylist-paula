import { describe, it, expect } from 'vitest';
import { classifyFetchError, fetchErrorKey } from './fetchErrors';
import { translations } from '@/i18n/translations';

/**
 * The two refusals we actually met, and the sentence each one earns.
 *
 * Measured 2026-09-10: Zara answers 403 at the edge, H&M accepts the request
 * and then resets the stream, which Node reports as a timeout. Both used to
 * reach the user as English technical noise that read like Paula's own fault.
 */
describe('classifyFetchError', () => {
  it('reads a 403 as the shop refusing, not as a broken page', () => {
    expect(classifyFetchError({ status: 403, message: 'shop returned HTTP 403' })).toBe('blocked');
    expect(classifyFetchError({ status: 429, message: 'shop returned HTTP 429' })).toBe('blocked');
  });

  it('reads a dropped connection as a wall, not as our own timeout', () => {
    expect(classifyFetchError({ message: 'The operation was aborted due to timeout' })).toBe('timeout');
    expect(classifyFetchError({ message: 'socket hang up' })).toBe('timeout');
    expect(classifyFetchError({ message: 'fetch failed' })).toBe('timeout');
  });

  it('keeps robots.txt apart from a bot wall — one is permission, the other is a door', () => {
    expect(classifyFetchError({ status: 403, message: 'example.com disallows this path in robots.txt for PaulaBot' }))
      .toBe('robots-disallow');
  });

  it('names the ordinary failures', () => {
    expect(classifyFetchError({ status: 500, message: 'shop returned HTTP 500' })).toBe('http-error');
    expect(classifyFetchError({ message: 'refusing to fetch a private address' })).toBe('private-address');
    expect(classifyFetchError({ message: 'only http and https links are supported' })).toBe('not-a-url');
  });

  it('falls back rather than inventing a diagnosis', () => {
    expect(classifyFetchError({ message: 'something nobody has seen yet' })).toBe('unknown');
    expect(classifyFetchError({})).toBe('unknown');
  });
});

describe('fetchErrorKey', () => {
  it('has a Polish sentence for every code it can return', () => {
    const codes = ['blocked', 'robots-disallow', 'timeout', 'http-error', 'not-a-url', 'private-address', 'no-content', 'unknown'];
    for (const code of codes) {
      const key = fetchErrorKey(code);
      expect(translations.pl[key], `brak polskiego tekstu dla ${code}`).toBeTruthy();
      expect(translations.en[key], `missing English text for ${code}`).toBeTruthy();
    }
  });

  it('never leaves an unknown code without words', () => {
    expect(fetchErrorKey('a code from the future')).toBe('importErrorUnknown');
  });

  it('does not blame the user for a shop that blocks robots', () => {
    // The wording matters as much as the code: this is the one message a user
    // will read as "the app is broken" unless it says otherwise.
    expect(translations.pl.importErrorTimeout).toContain('nic nie jest zepsute');
    expect(translations.pl.importErrorBlocked).toContain('nie udaje przeglądarki');
  });
});
