import { History } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { pointKey } from '@/lib/fit/copy';
import { useBrandMemory } from '@/lib/fitMemory';
import type { FitAnswer } from '@/lib/fitFeedback';
import type { PointTally } from '@/lib/fit/learning';

/**
 * What she already told Paula about this brand.
 *
 * Sizing is a property of a brand's patterns. If two dresses from the same
 * label pulled at the waist, that is the single most useful thing anyone can
 * say about the third one — and it is her own data, not a stranger's review.
 *
 * The counts are printed next to every sentence on purpose: a lean built on
 * two garments has to look like a lean built on two garments.
 */
export function BrandFitMemory({ brand }: { brand: string }) {
  const { t } = useLanguage();
  const { memory } = useBrandMemory(brand);

  if (!memory || memory.points.length === 0) return null;

  const answerLabel = (a: FitAnswer) =>
    a === 'tight' ? t('feedbackTight') : a === 'ok' ? t('feedbackOk') : t('feedbackLoose');

  const counts = (tally: PointTally) =>
    (['tight', 'ok', 'loose'] as FitAnswer[])
      .filter(a => tally[a] > 0)
      .map(a => `${tally[a]} × ${answerLabel(a)}`)
      .join(' · ');

  return (
    <div className="bg-card rounded-xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-1">
        <History className="w-4 h-4" />
        <span className="text-sm font-medium">{t('brandMemoryTitle', brand)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t('brandMemoryGarments', memory.garments)}</p>

      <ul className="mt-4 space-y-2.5">
        {memory.points.map(tally => (
          <li key={tally.point} className="text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>{t(pointKey(tally.point))}</span>
              <span className="text-muted-foreground text-xs">{counts(tally)}</span>
            </div>
            {tally.lean && (
              <p className="text-xs mt-0.5">
                <span className="text-muted-foreground">{t('brandMemoryMostOften')}: </span>
                <span className="font-medium">{answerLabel(tally.lean)}</span>
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{t('brandMemoryNote')}</p>
    </div>
  );
}
