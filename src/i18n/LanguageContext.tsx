import { createContext, useContext, useState, ReactNode } from 'react';
import { translate, Language, TranslationKey } from './translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, ...args: any[]) => string;
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() =>
    resolveInitialLanguage(
      localStorage.getItem(LANGUAGE_STORAGE_KEY),
      typeof navigator === 'undefined' ? undefined : navigator.language,
    ),
  );

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
  };

  const t = (key: TranslationKey, ...args: any[]): string => translate(lang, key, ...args);

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
