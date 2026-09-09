import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * The measurement guide.
 *
 * This screen is not decoration. Casciani & Bertolini (2025), quoted in
 * `research/research-04-body-analysis.md`, measured tape measurement at
 * **13,2% mean error without instructions and 5,7% with them** — better than a
 * 1800 EUR 3D scanner (6,7%) and on par with the best measuring apps (5,1%).
 * So the wording below is the single highest-return accuracy investment in the
 * project, and every line of it earns its place. Do not trim it for tidiness.
 *
 * The four general rules come first on purpose: tape tension, tape level,
 * clothing, and posture are the errors that repeat across all three
 * circumferences, so fixing them once fixes every measurement.
 *
 * `highHip` is optional and deliberately last. FFIT needs it to tell Spoon from
 * Bottom Hourglass (ratio 1.193, see `lib/fit/shape.ts`), and no measuring API
 * on the market returns it — the same research file records that mobile apps
 * failed to detect exactly this measurement. If we want that distinction, we
 * have to ask.
 */

export type MeasureKey = 'bust' | 'waist' | 'hips' | 'highHip';

const ORDER: MeasureKey[] = ['bust', 'waist', 'hips', 'highHip'];

/** Where the tape sits, in the diagram's coordinate space. */
const BANDS: Record<MeasureKey, { y: number; rx: number; ry: number }> = {
  bust: { y: 70, rx: 32, ry: 5 },
  waist: { y: 100, rx: 24, ry: 4.5 },
  highHip: { y: 118, rx: 29, ry: 5 },
  hips: { y: 136, rx: 34, ry: 5.5 },
};

/**
 * Torso outline with the tape drawn where it belongs. The back half of each
 * band is dashed and the front half solid, so "keep the tape level all the way
 * round" is visible rather than only written.
 */
function TorsoDiagram({ highlight }: { highlight: MeasureKey }) {
  return (
    <svg viewBox="0 0 120 200" className="w-full h-full text-foreground" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx="60" cy="22" r="11" />
        <path d="M60,33 L60,42" />
        <path d="M38,44 L82,44" />
        <path d="M38,44 C30,50 27,60 28,70 C30,82 36,92 36,100 C36,108 32,112 32,118 C30,126 26,130 26,136 C26,152 32,164 34,178 L35,196" />
        <path d="M82,44 C90,50 93,60 92,70 C90,82 84,92 84,100 C84,108 88,112 88,118 C90,126 94,130 94,136 C94,152 88,164 86,178 L85,196" />
      </g>

      {ORDER.map(key => {
        const band = BANDS[key];
        const on = key === highlight;
        return (
          <g key={key} className={on ? 'opacity-100' : 'opacity-15'}>
            <ellipse
              cx="60"
              cy={band.y}
              rx={band.rx}
              ry={band.ry}
              fill="none"
              stroke="currentColor"
              strokeWidth={on ? 1.6 : 1}
              strokeDasharray="3 3"
              className="text-foreground"
            />
            <path
              d={`M${60 - band.rx},${band.y} A${band.rx},${band.ry} 0 0 0 ${60 + band.rx},${band.y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={on ? 2.4 : 1.2}
              strokeLinecap="round"
              className="text-foreground"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function MeasureGuide({
  open,
  onOpenChange,
  focus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  focus?: MeasureKey;
}) {
  const { t } = useLanguage();
  const refs = useRef<Partial<Record<MeasureKey, HTMLDivElement | null>>>({});

  // Opening from a specific field lands on that measurement rather than making
  // the user hunt for it in a long page. The jump is instant on purpose:
  // `behavior: 'smooth'` needs animation frames, and a document that is not
  // being painted never produces them — measured here, where the scroll simply
  // did not happen. Instant is also the better answer to "show me this one
  // measurement": there is nothing to see on the way.
  useEffect(() => {
    if (!open || !focus) return;
    const id = window.setTimeout(() => {
      refs.current[focus]?.scrollIntoView({ block: 'start' });
    }, 120);
    return () => window.clearTimeout(id);
  }, [open, focus]);

  const rules = [
    { title: t('measureRuleTensionTitle'), body: t('measureRuleTension') },
    { title: t('measureRuleLevelTitle'), body: t('measureRuleLevel') },
    { title: t('measureRuleClothingTitle'), body: t('measureRuleClothing') },
    { title: t('measureRulePostureTitle'), body: t('measureRulePosture') },
    { title: t('measureRuleTwiceTitle'), body: t('measureRuleTwice') },
  ];

  const steps: { key: MeasureKey; label: string; where: string; mistake: string; optional?: boolean }[] = [
    { key: 'bust', label: t('bust'), where: t('guideBustWhere'), mistake: t('guideBustMistake') },
    { key: 'waist', label: t('waist'), where: t('guideWaistWhere'), mistake: t('guideWaistMistake') },
    { key: 'hips', label: t('hips'), where: t('guideHipsWhere'), mistake: t('guideHipsMistake') },
    { key: 'highHip', label: t('highHip'), where: t('guideHighHipWhere'), mistake: t('guideHighHipMistake'), optional: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t('measureGuideTitle')}</DialogTitle>
          <DialogDescription>{t('measureGuideIntro')}</DialogDescription>
        </DialogHeader>

        <div className="bg-card rounded-2xl p-5 mb-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
            {t('measureRulesHeading')}
          </div>
          <ol className="space-y-3">
            {rules.map((rule, i) => (
              <li key={rule.title} className="flex gap-3">
                <span className="text-xs text-muted-foreground w-4 pt-0.5 flex-shrink-0">{i + 1}</span>
                <div>
                  <div className="text-sm font-medium">{rule.title}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{rule.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          {steps.map(step => (
            <div
              key={step.key}
              ref={el => { refs.current[step.key] = el; }}
              className="border border-border rounded-2xl p-5 scroll-mt-2"
            >
              <div className="flex gap-5">
                <div className="w-24 flex-shrink-0">
                  <TorsoDiagram highlight={step.key} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-display text-lg">{step.label}</h3>
                    {step.optional && (
                      <span className="text-xs text-muted-foreground">{t('optionalLabel')}</span>
                    )}
                  </div>
                  <p className="text-sm mt-2">{step.where}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium text-foreground">{t('commonMistake')}: </span>
                    {step.mistake}
                  </p>
                  {step.key === 'highHip' && (
                    <p className="text-sm text-muted-foreground mt-2">{t('guideHighHipWhy')}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-2">{t('measureGuideFooter')}</p>
      </DialogContent>
    </Dialog>
  );
}
