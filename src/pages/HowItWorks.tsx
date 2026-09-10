import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { pointKey } from '@/lib/fit/copy';
import { WEIGHTS } from '@/lib/fit/score';
import type { BodyPoint } from '@/lib/fit/types';
import type { TranslationKey } from '@/i18n/translations';

/**
 * How the ranking works, written down.
 *
 * This is not a nice-to-have. A shop that ranks products has to disclose the
 * main parameters of that ranking and their relative weight, and has to say
 * whether anyone paid for a position — the Omnibus amendments to the Consumer
 * Rights Directive, in force in Poland since 2023. Paula ranks by Fit Score,
 * so Fit Score is what has to be explained.
 *
 * The weights are read from the engine rather than retyped, and a test says
 * so. An explanation that drifts away from the code it explains is worse than
 * no explanation: it is a false statement about how the product treats her.
 */

const SECTIONS: { title: TranslationKey; body: TranslationKey[] }[] = [
  { title: 'hiwFitTitle', body: ['hiwFitBody1', 'hiwFitBody2'] },
  { title: 'hiwModifiersTitle', body: ['hiwModifier1', 'hiwModifier2', 'hiwModifier3', 'hiwModifier4'] },
  { title: 'hiwConfidenceTitle', body: ['hiwConfidenceBody'] },
  {
    title: 'hiwRankingTitle',
    body: ['hiwRankingSearch', 'hiwRankingFeed', 'hiwRankingBest', 'hiwRankingNoPaid'],
  },
  { title: 'hiwMoneyTitle', body: ['hiwMoneyBody'] },
  { title: 'hiwNotTitle', body: ['hiwNot1', 'hiwNot2', 'hiwNot3', 'hiwNot4'] },
  { title: 'hiwDataTitle', body: ['hiwDataBody1', 'hiwDataBody2'] },
];

export default function HowItWorks() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const points = Object.entries(WEIGHTS) as [BodyPoint, number][];
  const heaviest = Math.max(...points.map(([, weight]) => weight));

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-card" aria-label={t('back')}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl lg:text-3xl">{t('howItWorksTitle')}</h1>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-8">{t('howItWorksLead')}</p>

      <section className="bg-card rounded-2xl p-5 sm:p-6 mb-4">
        <h2 className="text-sm font-medium mb-3">{t(SECTIONS[0].title)}</h2>
        {SECTIONS[0].body.map(key => (
          <p key={key} className="text-sm leading-relaxed text-muted-foreground mb-2 last:mb-0">{t(key)}</p>
        ))}

        <div className="mt-5 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
            {t('hiwWeightsTitle')}
          </div>
          <ul className="space-y-2">
            {points.map(([point, weight]) => (
              <li key={point} className="flex items-center gap-3">
                <span className="text-sm w-20 shrink-0">{t(pointKey(point))}</span>
                <span
                  className="h-1.5 rounded-full bg-foreground/25"
                  style={{ width: `${(weight / heaviest) * 60}%` }}
                  aria-hidden="true"
                />
                <span className="text-sm text-muted-foreground">{weight}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{t('hiwWeightsNote')}</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t('hiwWeightsSource')}</p>
        </div>
      </section>

      {SECTIONS.slice(1).map(section => (
        <section key={section.title} className="bg-card rounded-2xl p-5 sm:p-6 mb-4">
          <h2 className="text-sm font-medium mb-3">{t(section.title)}</h2>
          {/* A dash in front of a single paragraph reads as a list of one. */}
          {section.body.length === 1 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{t(section.body[0])}</p>
          ) : (
            <ul className="space-y-2">
              {section.body.map(key => (
                <li key={key} className="text-sm leading-relaxed text-muted-foreground flex gap-2.5">
                  <span aria-hidden="true">—</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="bg-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-medium mb-3">{t('hiwCheckTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('hiwCheckBody')}</p>
        <button
          onClick={() => navigate('/app/profile')}
          className="mt-4 text-sm font-medium underline underline-offset-4"
        >
          {t('hiwCheckLink')}
        </button>
      </section>
    </div>
  );
}
