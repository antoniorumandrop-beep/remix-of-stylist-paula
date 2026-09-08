import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

export default function BuildYourStyle() {
  const { t } = useLanguage();
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <Sparkles className="w-6 h-6" />
        <h1 className="font-display text-3xl">{t('buildYourStyle')}</h1>
      </div>
      <p className="text-muted-foreground mb-8">{t('buildYourStyleDesc')}</p>

      <div className="rounded-2xl border border-border p-8 bg-card/50 text-center">
        <p className="text-sm text-muted-foreground">
          {t('buildYourStyleComingSoon')}
        </p>
      </div>
    </div>
  );
}
