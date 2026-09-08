import { useNavigate } from 'react-router-dom';
import { defaultProfile } from '@/data/mockData';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useBodyProfile } from '@/lib/profile';
import { shapeKey } from '@/lib/fit/copy';

export default function Profile() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { profile, shape } = useBodyProfile();
  const userName = localStorage.getItem('paula-username') || defaultProfile.name;
  const inspirations: string[] = JSON.parse(localStorage.getItem('paula-inspirations') || '[]');

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
    { label: t('style'), value: defaultProfile.aesthetics.join(', ') },
    { label: t('styleInspirations'), value: inspirations.length > 0 ? inspirations.join(', ') : t('notSet') },
    { label: t('occasions'), value: defaultProfile.occasions.join(', ') },
    { label: t('budget'), value: `${defaultProfile.budgetMin}–${defaultProfile.budgetMax} PLN` },
    { label: t('favoriteBrands'), value: defaultProfile.brands.join(', ') },
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

      <div className="mt-8 pt-8 border-t border-border">
        <button
          onClick={() => navigate('/onboarding')}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          {t('retakePhotoScan')}
        </button>
      </div>
    </div>
  );
}
