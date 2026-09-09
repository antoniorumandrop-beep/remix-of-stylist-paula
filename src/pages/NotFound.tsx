import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * The 404 page.
 *
 * This was the last untouched screen from the project template: English copy
 * in a Polish product, styled with tokens the rest of the app does not use,
 * and a plain `<a href="/">` that threw away the running application to
 * reload it from scratch. A wrong address is a small mistake and should cost
 * a small amount.
 */
const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error('404: próba wejścia na nieistniejącą ścieżkę:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <p className="font-display text-5xl mb-4">404</p>
        <h1 className="font-display text-2xl mb-3">{t('notFoundTitle')}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t('notFoundMessage')}</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t('notFoundBackHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
