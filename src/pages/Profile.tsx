import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Ruler } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBodyProfile } from '@/lib/profile';
import { useUserPrefs } from '@/lib/prefs';
import { useAuth, useSession } from '@/lib/auth';
import { shapeKey } from '@/lib/fit/copy';
import { FitLearningPanel } from '@/components/FitLearningPanel';
import type { TranslationKey } from '@/i18n/translations';

export default function Profile() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, shape } = useBodyProfile();
  const { prefs } = useUserPrefs();
  const { session } = useSession();
  const { signOut } = useAuth();
  const userName = prefs.name ?? t('notSet');
  const inspirations = prefs.inspirations;
  const list = (values: string[]) => (values.length > 0 ? values.join(', ') : null);
  const budgetValue = prefs.budgetMin !== null && prefs.budgetMax !== null
    ? `${prefs.budgetMin}–${prefs.budgetMax} PLN`
    : null;

  const measured = profile?.source === 'measured' ? profile : null;
  const diffs = shape?.diffs ?? null;

  const proportionsValue = measured
    ? `${measured.bust}/${measured.waist}/${measured.hips} cm${measured.highHip ? ` · ${t('highHip')} ${measured.highHip} cm` : ''}`
    : null;
  const shapeValue = shape
    ? `${t(shapeKey(shape.shape))} · ${t(profile?.source === 'measured' ? 'measured' : 'selected')}`
    : null;
  const heightValue = profile?.heightCm ? `${profile.heightCm} cm` : null;

  const sections: { label: string; value: string | null; to?: string }[] = [
    { label: t('name'), value: prefs.name ?? null },
    { label: t('proportions'), value: proportionsValue, to: '/onboarding' },
    { label: t('bodyShape'), value: shapeValue, to: '/onboarding' },
    { label: t('height'), value: heightValue, to: '/onboarding' },
    { label: t('style'), value: list(prefs.aesthetics), to: '/onboarding' },
    { label: t('styleInspirations'), value: list(inspirations), to: '/onboarding' },
    { label: t('occasions'), value: list(prefs.occasions), to: '/onboarding' },
    { label: t('budget'), value: budgetValue, to: '/onboarding' },
    { label: t('favoriteBrands'), value: list(prefs.brands), to: '/onboarding' },
  ];

  // Plain arithmetic, stated as arithmetic. No verdicts about the body.
  const fitNotes: string[] = [];
  if (diffs) {
    const hipsWaist = Math.round(diffs.hipsWaist);
    const bustHips = Math.round(diffs.bustHips);
    if (hipsWaist >= 4) fitNotes.push(t('profileHipsWider', hipsWaist));
    else if (hipsWaist <= -4) fitNotes.push(t('profileWaistWider', Math.abs(hipsWaist)));
    else fitNotes.push(t('profileWaistHipsEven'));

    if (bustHips >= 4) fitNotes.push(t('profileBustWider', bustHips));
    else if (bustHips <= -4) fitNotes.push(t('profileHipsWiderThanBust', Math.abs(bustHips)));
    else fitNotes.push(t('profileBustHipsEven'));
  }

  const measurementRows: { key: TranslationKey; value: number | undefined }[] = measured
    ? [
        { key: 'bust', value: measured.bust },
        { key: 'waist', value: measured.waist },
        { key: 'hips', value: measured.hips },
        { key: 'highHip', value: measured.highHip },
        { key: 'height', value: measured.heightCm },
      ]
    : [];

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="font-display text-2xl lg:text-3xl mb-8">{t('yourProfile')}</h1>

      {shape ? (
        <div className="bg-card rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-start gap-5 sm:gap-6">
            <div className="w-12 sm:w-16 h-20 sm:h-24 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 40 80" className="w-full h-full text-foreground" aria-hidden="true">
                <circle cx="20" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <line x1="10" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="1.2" />
                <path d="M12,18 L11,30 L13,42 L8,55 L16,75 M28,18 L29,30 L27,42 L32,55 L24,75" fill="none" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground uppercase tracking-widest">
                {t(profile?.source === 'measured' ? 'profileFromMeasurements' : 'profileShapeYouPicked')}
              </div>
              <div className="font-display text-xl sm:text-2xl mt-1">{t(shapeKey(shape.shape))}</div>
              <p className="text-xs text-muted-foreground mt-1.5">{t('profileShapeDisclaimer')}</p>
            </div>
          </div>

          {measurementRows.length > 0 && (
            <dl className="mt-5 pt-5 border-t border-border grid grid-cols-3 sm:grid-cols-5 gap-3">
              {measurementRows.map(row => (
                <div key={row.key}>
                  <dt className="text-[11px] text-muted-foreground">{t(row.key)}</dt>
                  <dd className="text-sm font-medium mt-0.5">
                    {row.value ? `${row.value} cm` : '—'}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {fitNotes.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                {t('profileWhatThisMeans')}
              </div>
              <div className="space-y-1.5">
                {fitNotes.map(note => (
                  <p key={note} className="text-sm text-foreground leading-relaxed">{note}</p>
                ))}
              </div>
            </div>
          )}

          {shape.merged && (
            <p className="mt-4 text-xs text-muted-foreground">{t('shapeMerged')}</p>
          )}

          <button
            onClick={() => navigate('/onboarding')}
            className="mt-5 inline-flex items-center gap-2 text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Ruler className="w-4 h-4" />
            {t('profileUpdateMeasurements')}
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl p-5 sm:p-6 mb-6">
          <div className="font-display text-xl sm:text-2xl">{t('profileEmptyTitle')}</div>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{t('profileEmptyBody')}</p>
          <ul className="mt-4 space-y-2">
            {(['profileEmptyBullet1', 'profileEmptyBullet2', 'profileEmptyBullet3'] as const).map(key => (
              <li key={key} className="text-sm flex gap-2.5">
                <span className="text-muted-foreground">—</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => navigate('/onboarding')}
            className="mt-5 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('addMeasurements')}
          </button>
          <p className="text-xs text-muted-foreground mt-3">{t('profileEmptyFooter')}</p>
        </div>
      )}

      <FitLearningPanel />

      <div className="text-xs text-muted-foreground uppercase tracking-widest px-4 mb-2">
        {t('profileYourDetails')}
      </div>
      <div className="space-y-1">
        {sections.map(section => (
          <button
            key={section.label}
            onClick={() => section.to && navigate(section.to)}
            className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:bg-card transition-colors text-left"
          >
            <div className="min-w-0 pr-3">
              <div className="text-xs text-muted-foreground mb-0.5">{section.label}</div>
              <div className={`text-sm ${section.value ? 'font-medium' : 'text-muted-foreground'}`}>
                {section.value ?? t('profileTapToAdd')}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-border flex flex-col gap-4 items-start">
        <button
          onClick={() => navigate('/onboarding')}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          {t('retakePhotoScan')}
        </button>
        <button
          onClick={async () => { await signOut(); navigate('/', { replace: true }); }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {t('signOut')}{session?.email ? ` · ${session.email}` : ''}
        </button>
      </div>
    </div>
  );
}
