import type { Language } from './translations';

/**
 * Choosing and remembering the interface language.
 *
 * Kept out of `LanguageContext.tsx` because none of it is React: it is pure
 * logic plus two guarded storage calls, and it is easier to test — and to
 * reason about — on its own.
 */

export const LANGUAGE_STORAGE_KEY = 'paula-lang';

/**
 * Which language a first-time visitor sees.
 *
 * Paula is a Polish product: the catalogue, the prices, the brands and the
 * shops are all Polish, so English was the wrong default — it greeted the
 * intended user in a foreign language and showed her "129 PLN" underneath it.
 * Polish is therefore the default, and the browser is consulted only to hand
 * English to someone who has explicitly asked their browser for English.
 *
 * A stored choice always wins: once she has picked, we never second-guess her.
 */
export function resolveInitialLanguage(
  stored: string | null,
  navigatorLanguage?: string,
): Language {
  if (stored === 'pl' || stored === 'en') return stored;
  if (navigatorLanguage?.toLowerCase().startsWith('en')) return 'en';
  return 'pl';
}

/**
 * `localStorage` does not merely return null when a browser has site data
 * blocked — the property access itself throws. That happens during the very
 * first render, inside a state initialiser, so an unguarded read takes the
 * whole application down before anything is on screen. Losing the remembered
 * language is a small cost; a crash screen is not.
 */
export function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function rememberLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // She keeps the language for this visit; it just will not be remembered.
  }
}
