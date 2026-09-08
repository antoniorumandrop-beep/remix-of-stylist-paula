import { useLanguage } from '@/i18n/LanguageContext';

interface FitBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

export function FitBadge({ score, size = 'sm' }: FitBadgeProps) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full bg-foreground text-background ${
        size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-sm px-3 py-1.5'
      }`}
    >
      {t('fit')} {score}%
    </span>
  );
}
