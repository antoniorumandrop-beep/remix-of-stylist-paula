import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { pointKey } from '@/lib/fit/copy';
import { useBrandMemory, useFitAccuracy } from '@/lib/fitMemory';
import type { FitAnswer } from '@/lib/fitFeedback';

/**
 * Paula's own scoreboard.
 *
 * Every shopping app tells you how good its recommendations are. None of them
 * shows you the count of times it was wrong. Fit Score is only worth trusting
 * if it can be checked, so the check lives on her profile, in her own numbers,
 * next to the answers she gave.
 *
 * It is allowed to look bad. A low number is information — about the scorer,
 * about the catalogue's missing attributes, or about a profile that needs
 * remeasuring — and hiding it would make the good number meaningless too.
 */
export function FitLearningPanel() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { result, answered } = useFitAccuracy();
  const { all: brands } = useBrandMemory();

  const answerLabel = (a: FitAnswer) =>
    a === 'tight' ? t('feedbackTight') : a === 'ok' ? t('feedbackOk') : t('feedbackLoose');

  const leans = brands
    .map(memory => ({ memory, points: memory.points.filter(p => p.lean) }))
    .filter(entry => entry.points.length > 0);

  return (
    <div className="bg-card rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4" />
        <span className="text-sm font-medium">{t('learnedTitle')}</span>
      </div>

      {answered === 0 ? (
        <>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{t('learnedEmpty')}</p>
          <button
            onClick={() => navigate('/app/fitting-room')}
            className="mt-4 text-sm font-medium underline underline-offset-4"
          >
            {t('learnedOpenWardrobe')}
          </button>
        </>
      ) : result.total === 0 ? (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{t('learnedNoPredictions')}</p>
      ) : (
        <>
          <p className="font-display text-3xl mt-3">{t('learnedHits', result.hits, result.total)}</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t('learnedHitsDesc')}</p>

          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
              {t('learnedPointsTitle')}
            </div>
            <ul className="space-y-1.5">
              {result.points.map(point => (
                <li key={point.point} className="text-sm flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{t(pointKey(point.point))}</span>
                  <span>{t('learnedHits', point.hits, point.total)}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{t('learnedUnknownNote')}</p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t('learnedProfileNote')}</p>
        </>
      )}

      {leans.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2.5">
            {t('learnedBrandsTitle')}
          </div>
          <ul className="space-y-3">
            {leans.map(({ memory, points }) => (
              <li key={memory.brand}>
                <button
                  onClick={() => navigate(`/app/brand/${encodeURIComponent(memory.brand)}`)}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {memory.brand}
                </button>
                <span className="text-xs text-muted-foreground">
                  {' · '}
                  {t('learnedGarmentsAnswered', memory.garments)}
                </span>
                <ul className="mt-1 space-y-0.5">
                  {points.map(point => (
                    <li key={point.point} className="text-xs text-muted-foreground">
                      {t(pointKey(point.point))}: {t('brandMemoryMostOften').toLowerCase()}{' '}
                      <span className="text-foreground">{answerLabel(point.lean!)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
