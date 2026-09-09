import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { translate, type Language, type TranslationKey, type TranslationArgs } from './translations';
import { readStoredLanguage, rememberLanguage, resolveInitialLanguage } from './language';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Typed per key: a message that interpolates a count cannot be called without it. */
  t: <K extends TranslationKey>(key: K, ...args: TranslationArgs<K>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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
