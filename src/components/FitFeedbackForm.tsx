import { useState } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { FEEDBACK_POINTS, useFitFeedback, type FitAnswer } from '@/lib/fitFeedback';
import { pointKey } from '@/lib/fit/copy';
import type { BodyPoint } from '@/lib/fit/types';

interface FitFeedbackFormProps {
  productId: string;
  onDone?: () => void;
}

const ANSWERS: FitAnswer[] = ['tight', 'ok', 'loose'];

/**
 * Five rows, three buttons each. Deliberately tiny: the whole point is that
 * answering takes ten seconds, so people actually do it.
 */
export function FitFeedbackForm({ productId, onDone }: FitFeedbackFormProps) {
  const { t } = useLanguage();
  const { forProduct, save } = useFitFeedback();
  const existing = forProduct(productId);
  const [answers, setAnswers] = useState<Partial<Record<BodyPoint, FitAnswer>>>(existing?.answers ?? {});

  const answered = Object.keys(answers).length > 0;

  const label = (a: FitAnswer) =>
    a === 'tight' ? t('feedbackTight') : a === 'ok' ? t('feedbackOk') : t('feedbackLoose');

  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="text-sm font-medium">{t('didItFit')}</div>
      <p className="text-xs text-muted-foreground mt-1 mb-4">{t('didItFitDesc')}</p>

      <div className="space-y-2.5">
        {FEEDBACK_POINTS.map(point => (
          <div key={point} className="flex items-center justify-between gap-3">
            <span className="text-sm">{t(pointKey(point))}</span>
            <div className="flex gap-1">
              {ANSWERS.map(a => {
                const active = answers[point] === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [point]: a }))}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      active ? 'bg-foreground text-background' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {label(a)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!answered}
        onClick={() => { save(productId, answers); onDone?.(); }}
        className="mt-5 w-full py-2.5 rounded-full bg-foreground text-background text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Check className="w-4 h-4" />
        {t('saveFeedback')}
      </button>
    </div>
  );
}
