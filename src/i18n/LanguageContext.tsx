import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { translate, type Language, type TranslationKey, type TranslationArgs } from './translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Typed per key: a message that interpolates a count cannot be called without it. */
  t: <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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
 * blocked — the property access itself throws. That happens here, inside a
 * state initialiser, during the very first render, so an unguarded read takes
 * the whole application down before anything is on screen. Reading and writing
 * are both wrapped for that reason; losing the remembered language is a small
 * cost, and a crash screen is not.
 */
function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // She keeps the language for this visit; it just will not be remembered.
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() =>
    resolveInitialLanguage(
      readStoredLanguage(),
      typeof navigator === 'undefined' ? undefined : navigator.language,
    ),
  );

  const changeLang = useCallback((newLang: Language) => {
    setLang(newLang);
    rememberLanguage(newLang);
  }, []);

  const t = useCallback(
    <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>): string => translate(lang, key, ...args),
    [lang],
  );

  /**
   * Every screen in the app reads this context, so an unmemoised value made
   * all of them re-render whenever the provider rendered for any reason at
   * all — `t` was a new function on every pass, so the value was a new object
   * on every pass. Now it changes only when the language does, which is the
   * only time any consumer needs to hear about it.
   */
  const value = useMemo(() => ({ lang, setLang: changeLang, t }), [lang, changeLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
