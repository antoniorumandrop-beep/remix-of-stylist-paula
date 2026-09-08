import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Globe } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <button
        onClick={() => setLang(lang === 'en' ? 'pl' : 'en')}
        className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-2 rounded-full bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        {lang.toUpperCase()}
      </button>
      <div className="text-center max-w-lg">
        <h1 className="font-display text-5xl md:text-7xl mb-6">Paula</h1>
        <p className="text-muted-foreground text-lg mb-12 leading-relaxed">
          {t('welcomeTagline')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('getStarted')}
          </button>
          <button
            onClick={() => navigate('/login?mode=login')}
            className="w-full sm:w-auto px-8 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('logIn')}
          </button>
        </div>
      </div>
    </div>
  );
}
