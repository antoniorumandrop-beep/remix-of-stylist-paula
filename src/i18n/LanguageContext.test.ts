import { describe, it, expect } from 'vitest';
import { resolveInitialLanguage } from './LanguageContext';

/**
 * Paula sells Polish clothes at Polish prices in Polish shops. Defaulting to
 * English greeted the intended user in the wrong language, so these cases are
 * about who the product is for, not about i18n plumbing.
 */
describe('resolveInitialLanguage', () => {
  it('honours a stored choice above everything else', () => {
    expect(resolveInitialLanguage('en', 'pl-PL')).toBe('en');
    expect(resolveInitialLanguage('pl', 'en-US')).toBe('pl');
  });

  it('ignores a stored value it does not recognise', () => {
    expect(resolveInitialLanguage('de', undefined)).toBe('pl');
    expect(resolveInitialLanguage('', undefined)).toBe('pl');
  });

  it('gives Polish to a first-time visitor when nothing says otherwise', () => {
    expect(resolveInitialLanguage(null, undefined)).toBe('pl');
    expect(resolveInitialLanguage(null, 'pl-PL')).toBe('pl');
  });

  it('gives English only to a browser that asked for English', () => {
    expect(resolveInitialLanguage(null, 'en-US')).toBe('en');
    expect(resolveInitialLanguage(null, 'EN-GB')).toBe('en');
  });

  it('falls back to Polish for any other locale', () => {
    // A German or Ukrainian browser lands on a Polish shop; Polish is closer
    // to useful than English, and the prices are in PLN either way.
    expect(resolveInitialLanguage(null, 'de-DE')).toBe('pl');
    expect(resolveInitialLanguage(null, 'uk-UA')).toBe('pl');
  });
});
