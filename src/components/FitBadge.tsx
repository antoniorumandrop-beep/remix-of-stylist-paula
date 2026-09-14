import { useLanguage } from '@/i18n/LanguageContext';
import { isLowConfidence } from '@/lib/fit/confidence';

interface FitBadgeProps {
  score: number;
  /**
   * How much the engine knew about the garment, 0–1. Without it the badge
   * behaves as it always did — a plain number.
   */
  confidence?: number;
  size?: 'sm' | 'md';
}

/**
 * A Fit Score, and how firm it is.
 *
 * `computeFit` penalises only what it can see, so a garment we know almost
 * nothing about scores *high* — the ZARA dress at 100% had one known
 * attribute. Printing that as a bare number puts it above garments we
 * genuinely measured, with nothing to tell them apart.
 *
 * The tilde is deliberately small: the score is real and worth showing, it is
 * the certainty that is thin. The full sentence lives in `aria-label` and on
 * the product page, where there is room for it.
 */
export function FitBadge({ score, confidence, size = 'sm' }: FitBadgeProps) {
  const { t } = useLanguage();
  const approximate = confidence !== undefined && isLowConfidence(confidence);
  return (
    <span
      role="img"
      aria-label={approximate ? t('fitBadgeApproximateLabel', score) : `${t('fit')} ${score}%`}
      className={`inline-flex items-center font-medium rounded-full ${
        approximate ? 'border border-foreground/25 text-foreground' : 'bg-foreground text-background'
      } ${size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-sm px-3 py-1.5'}`}
    >
      {t('fit')} {approximate ? '~' : ''}{score}%
    </span>
  );
}
