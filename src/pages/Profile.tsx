import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBodyProfile } from '@/lib/profile';
import { useUserPrefs } from '@/lib/prefs';
import { useAuth, useSession } from '@/lib/auth';
import { shapeKey } from '@/lib/fit/copy';

export default function Profile() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, shape } = useBodyProfile();
  const { prefs } = useUserPrefs();
  const { session } = useSession();
  const { signOut } = useAuth();
  const userName = prefs.name ?? t('notSet');
  const inspirations = prefs.inspirations;
  const list = (values: string[]) => (values.length > 0 ? values.join(', ') : t('notSet'));
  const budgetValue = prefs.budgetMin !== null && prefs.budgetMax !== null
    ? `${prefs.budgetMin}–${prefs.budgetMax} PLN`
    : t('notSet');

  const proportionsValue = profile?.source === 'measured'
    ? `${profile.bust}/${profile.waist}/${profile.hips} cm`
    : t('notSet');
  const shapeValue = shape
    ? `${t(shapeKey(shape.shape))} · ${t(profile?.source === 'measured' ? 'measured' : 'selected')}`
    : t('notSet');
  const heightValue = profile?.heightCm ? `${profile.heightCm} cm` : t('notSet');

  const sections = [
    { label: t('name'), value: userName },
    { label: t('proportions'), value: proportionsValue, to: '/onboarding' },
    { label: t('bodyShape'), value: shapeValue, to: '/onboarding' },
    { label: t('height'), value: heightValue, to: '/onboarding' },
    { label: t('style'), value: list(prefs.aesthetics), to: '/onboarding' },
    { label: t('styleInspirations'), value: list(inspirations), to: '/onboarding' },
    { label: t('occasions'), value: list(prefs.occasions), to: '/onboarding' },
    { label: t('budget'), value: budgetValue, to: '/onboarding' },
    { label: t('favoriteBrands'), value: list(prefs.brands), to: '/onboarding' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="font-display text-2xl lg:text-3xl mb-8">{t('yourProfile')}</h1>

      <div className="bg-card rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-24 flex items-center justify-center">
            <svg viewBox="0 0 40 80" className="w-full h-full text-foreground">
              <circle cx="20" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <line x1="10" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="1.2" />
              <path d="M12,18 L11,30 L13,42 L8,55 L16,75 M28,18 L29,30 L27,42 L32,55 L24,75" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
          <div>
            <div className="font-display text-xl">{shape ? t(shapeKey(shape.shape)) : t('yourProportions')}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {profile?.source === 'measured'
                ? `${t('bust')} ${profile.bust} · ${t('waist')} ${profile.waist} · ${t('hips')} ${profile.hips} cm`
                : t('fitNoProfile')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {sections.map(section => (
          <button
            key={section.label}
            onClick={() => section.to && navigate(section.to)}
            className="w-full flex items-center justify-between px-4 py-4 rounded-xl hover:bg-card transition-colors text-left"
          >
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">{section.label}</div>
              <div className="text-sm font-medium">{section.value}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
