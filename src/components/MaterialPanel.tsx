import { FlaskConical, Leaf, Ruler, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import {
  careAdvice,
  materialProfile,
  naturalShare,
  parseComposition,
  type CompositionInput,
} from '@/lib/catalog/composition';
import { FIBERS } from '@/lib/catalog/fibers';
import { parseStretch } from '@/lib/fit/stretch';

const WASH_KEY = {
  dryClean: 'careWashDryClean',
  hand: 'careWashHand',
  cold: 'careWashCold',
  warm: 'careWashWarm',
} as const;

const IRON_KEY = {
  none: 'careIronNone',
  low: 'careIronLow',
  medium: 'careIronMedium',
  high: 'careIronHigh',
} as const;

const STRETCH_KEY = {
  none: 'stretchNone',
  low: 'stretchLow',
  high: 'stretchHigh',
} as const;

/**
 * Everything on this panel is derived from one field — the composition the
 * shop published. That is the whole point of it.
 *
 * What it replaces was sixteen hand-written English paragraphs plus a
 * `qualityScore` nobody computed: a number between 0 and 100, shown as a
 * coloured bar, invented per product. It looked like a measurement, and the
 * catalogue it lived in is mock data that will be deleted. Products imported
 * from a real shop had the panel switched off entirely, precisely because
 * there was nothing true to put in it — so the products that will be real were
 * the ones missing the screen.
 */
export function MaterialPanel({ composition }: { composition: CompositionInput }) {
  const { t } = useLanguage();

  const entries = parseComposition(composition);
  if (entries.length === 0) return null;

  const share = naturalShare(entries);
  const profile = materialProfile(entries);
  const care = careAdvice(entries);
  const stretch = parseStretch(composition);

  const axes = profile
    ? ([
        ['axisBreathability', profile.breathability],
        ['axisAbrasion', profile.abrasion],
        ['axisPilling', profile.pillingResistance],
      ] as const)
    : [];

  return (
    <section className="mt-12">
      <h2 className="font-display text-xl mb-6">{t('materialSection')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-4 h-4" />
            <span className="text-sm font-medium">{t('composition')}</span>
          </div>
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5">
                    {entry.natural ? (
                      <Leaf className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span>{entry.fiber ? t(FIBERS[entry.fiber].nameKey) : entry.label}</span>
                    {entry.natural !== null && (
                      <span className="text-xs text-muted-foreground">
                        {entry.natural ? t('natural') : t('synthetic')}
                      </span>
                    )}
                  </span>
                  {entry.percent !== null && <span className="font-medium">{entry.percent}%</span>}
                </div>
                {entry.percent !== null && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${entry.natural ? 'bg-foreground' : 'bg-foreground/30'}`}
                      style={{ width: `${entry.percent}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          {share !== null && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('naturalShareLabel')}</span>
                <span className="font-medium">{share}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">{t('naturalShareNote')}</p>
            </div>
          )}
        </div>

        {axes.length > 0 && (
          <div className="bg-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">{t('materialProperties')}</span>
            </div>
            <div className="space-y-3">
              {axes.map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{t(key)}</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{t('materialAxesNote')}</p>
          </div>
        )}

        <div className="bg-card rounded-xl p-5 flex flex-col gap-4">
          <div>
            <span className="text-sm font-medium block mb-2">{t('howItBehaves')}</span>
            <div className="space-y-2">
              {entries
                .filter(entry => entry.fiber !== null)
                .map(entry => (
                  <p key={entry.fiber} className="text-sm text-muted-foreground leading-relaxed">
                    {t(FIBERS[entry.fiber].behaviorKey)}
                  </p>
                ))}
            </div>
          </div>

          {stretch.level !== 'unknown' && (
            <div className="flex items-center gap-2 text-sm">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('stretchLabel')}:</span>
              <span>{t(STRETCH_KEY[stretch.level])}</span>
            </div>
          )}

          {care && (
            <div>
              <span className="text-sm font-medium block mb-2">{t('care')}</span>
              <div className="flex flex-wrap gap-2">
                {([
                  WASH_KEY[care.wash],
                  care.tumbleDry ? 'careTumbleOk' : 'careTumbleNo',
                  IRON_KEY[care.iron],
                ] as TranslationKey[]).map(key => (
                  <span key={key} className="px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">
                    {t(key)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
