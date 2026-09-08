import { createContext, useContext, useState, ReactNode } from 'react';
import { translate, Language, TranslationKey } from './translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, ...args: any[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    const stored = localStorage.getItem('paula-lang');
    return (stored === 'pl' || stored === 'en') ? stored : 'en';
  });

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('paula-lang', newLang);
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
